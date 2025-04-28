import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Client as _PgClient } from 'pg';
import { Observable } from 'rxjs';
import { DataSource, ILike, QueryRunner, Repository } from 'typeorm';
import { createLogger, escapeLikePattern } from '../../utils';
import { delay } from '../../utils/delay';
import { Dog } from './entities/dog.entity';

interface PgClient extends _PgClient {
  // client.processID should be available at runtime. If not, you would need to
  // add a preliminary query `SELECT pg_backend_pid()` before the real query to
  // save the processId.
  processID: number;
}

interface BoundPool {
  /**
   * All clients currently in the pool
   */
  _clients: any[];
  /**
   * Clients in the pool which are idle
   */
  _idle: any[];
  options: {
    /**
     * Maximum number of clients allowed in the pool
     */
    max: number;
  };
}

interface MasterDataSource extends DataSource {
  driver: { master: BoundPool } & DataSource['driver'];
}

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Dog)
    private dogRepository: Repository<Dog>,
    @InjectDataSource()
    private dataSource: MasterDataSource,
    @InjectDataSource('fallback')
    private fallbackDataSource: MasterDataSource,
  ) {}
  logger = createLogger(this);
  async seedDogs(totalCount: number) {
    const CHUNK_SIZE = 10000;
    const chunks = Math.ceil(totalCount / CHUNK_SIZE);
    let seededCount = 0;

    for (let chunk = 0; chunk < chunks; chunk++) {
      const currentChunkSize = Math.min(CHUNK_SIZE, totalCount - seededCount);
      const dogs: Dog[] = [];

      for (let i = 0; i < currentChunkSize; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const dog = this.dogRepository.create({
          name: `${firstName}bark ${lastName}dog`,
        });
        dogs.push(dog);
      }

      await this.dogRepository.save(dogs);
      seededCount += currentChunkSize;
      this.logger.log(
        `Seeded ${seededCount}/${totalCount} dogs (chunk ${chunk + 1}/${chunks})`,
      );
    }

    const finalCount = await this.dogRepository.count();

    this.logger.log(
      `Completed seeding ${seededCount} dogs. There are now ${await this.dogRepository.count()} dogs in the database.`,
    );
    return { seededCount, finalCount };
  }

  async searchDogsByName(name: string): Promise<Dog[]> {
    try {
      return this.dogRepository.find({
        where: {
          name: ILike(`%${escapeLikePattern(name)}%`),
        },
        take: 500,
      });
    } catch (error) {
      this.logger.error('Failed to search dogs:', error);
      throw error;
    }
  }

  searchDogsByNameOrTerminatePidOnClose(name: string): Observable<Dog[]> {
    return new Observable<Dog[]>((subscriber) => {
      const queryRunner = this.dataSource.createQueryRunner();
      let processId: number | null = null;
      let isQueryComplete = false;

      // Connect
      queryRunner
        .connect()
        .then((dbClient: PgClient) => {
          // this.logger.log({ dbClient });

          processId = dbClient.processID;
          this.logger.log('Connected query runner. PID:', processId);

          // Query for dogs
          queryRunner.manager
            .find(Dog, {
              where: {
                name: ILike(`%${escapeLikePattern(name)}%`),
              },
              take: 500,
            })
            .then((rows: Dog[]) => {
              isQueryComplete = true;
              this.logger.log(`Next'ing ${rows.length} dogs`);
              subscriber.next(rows);
              subscriber.complete();
              this.logger.log('Completed subscriber');
            })
            .catch((err) => {
              isQueryComplete = true;
              this.logger.error('Failed to query dogs:', err);
              subscriber.error(err);
            })
            .finally(() => {
              this.logger.log('Releasing search dogs query runner');
              queryRunner
                .release()
                .then(() => {
                  this.logger.log('Released search dogs query runner');
                })
                .catch((err) => {
                  this.logger.error(
                    'Failed to release search dogs query runner:',
                    err,
                  );
                });
            });
        })
        .catch((err) => {
          this.logger.error('Failed to connect query runner:', err);
          subscriber.error(err);
        });

      // Cleanup effect
      return () => {
        if (!isQueryComplete && processId) {
          this.logger.log(
            'Cleanup effect: canceling query for PID:',
            processId,
          );

          // Use the fallback pool if regular pool is busy and full. This helps
          // ensure that query cancellation can be performed even when the main
          // pool is at capacity.
          let dataSource: DataSource;
          if (this.isPoolAtCapacity(this.dataSource.driver.master)) {
            dataSource = this.fallbackDataSource;
            this.logger.log('Using fallback data source to cancel query');
          } else {
            dataSource = this.dataSource;
            this.logger.log('Using regular data source to cancel query');
          }

          // Cancel the search dogs query
          dataSource
            .query('SELECT pg_cancel_backend($1)', [processId])
            .then(() => {
              this.logger.log(
                'Cleanup effect: Cancelled query successfully for PID:',
                processId,
              );
            })
            .catch((err) => {
              this.logger.error('Cleanup effect: failed to cancel query:', err);
            });
        }
      };
    });
  }

  /**
   * Returns true if connection pool is full and there are no idle connections.
   */
  isPoolAtCapacity(pool: BoundPool) {
    return this.getPoolCapacity(pool) === 0;
  }

  /**
   * Returns the total available capacity of the connection pool.
   * This includes both currently idle connections and potential new connections
   * that could be created without exceeding the pool's maximum limit.
   */
  getPoolCapacity(pool: BoundPool): number {
    const clients = pool._clients || [];
    const idleClients = pool._idle || [];
    const maxClients = pool.options?.max || 0;

    // Calculate how many new connections can be created before reaching the max limit
    const capacityForNewClients = Math.max(0, maxClients - clients.length);

    // Total capacity is idle connections plus potential new connections
    return idleClients.length + capacityForNewClients;
  }

  /**
   * For testing, we want to allocate all but 1 connection of the main dataSource's connection pool. This enables experiments where a cancelable query is in flight, and the main dataSource has no idle connections with which to cancel the cancelable query.
   */
  async saturateConnectionPoolWithFakeSlowQueries(timeoutMs: number) {
    this.logger.log('Saturating connection pool');

    // Create query runners for all but 1 idle connection
    const queryRunners: QueryRunner[] = [];
    let poolCapacity: number = this.getPoolCapacity(
      this.dataSource.driver.master,
    );
    while (poolCapacity > 1) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      queryRunners.push(queryRunner);
      poolCapacity = this.getPoolCapacity(this.dataSource.driver.master);
    }

    this.logger.log(
      'Created',
      queryRunners.length,
      `query runners. Waiting for timeout (${timeoutMs}ms) ...`,
    );

    // Wait for timeout
    await delay(timeoutMs);

    this.logger.log('Releasing query runners');

    // Release query runners
    await Promise.allSettled(queryRunners.map((qr) => qr.release()));

    this.logger.log('Released query runners');
  }
}
