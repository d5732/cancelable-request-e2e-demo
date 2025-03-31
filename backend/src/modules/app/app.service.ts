import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client as _PgClient } from 'pg';
import { Observable } from 'rxjs';
import { DataSource, ILike, Repository } from 'typeorm';
import { createLogger } from '../../utils';
import { Dog } from './entities/dog.entity';

interface PgClient extends _PgClient {
  processID: number;
}

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Dog)
    private dogRepository: Repository<Dog>,
    private dataSource: DataSource,
  ) {}
  logger = createLogger(this);

  /**
   * Open connection 1
   * Get PID of connection 1 on connection 1
   * Get dogs on connection 1
   *
   * If subscriber closes before dogs query completes:
   * Open connection 2
   * Use connection 2 to send pg_cancel_backend(PID) to cancel connection 1's query
   * Close connection 2
   * Close connection 1
   */
  searchDogsByNameOrTerminatePidOnClose(name: string): Observable<Dog[]> {
    return new Observable<Dog[]>((subscriber) => {
      const queryRunner = this.dataSource.createQueryRunner();
      let processId: number | null = null;
      let isQueryComplete = false;

      // Establish a new database connection
      queryRunner
        .connect()
        .then((dbClient: PgClient) => {
          console.log({ dbClient });
          processId = dbClient.processID;
          this.logger.log('Connected to database. PID:', processId);

          // Query for dogs
          queryRunner.manager
            .find(Dog, {
              where: {
                name: ILike(`%${name}%`),
              },
              take: 500,
            })
            .then((rows: Dog[]) => {
              isQueryComplete = true;
              this.logger.log(`Next'ing ${rows.length} dogs`);
              subscriber.next(rows);
              subscriber.complete();
              this.logger.log('Subscriber completed');
            })
            .catch((err) => {
              isQueryComplete = true;
              this.logger.error('Failed to query dogs:', err);
              subscriber.error(err);
            })
            .finally(() => {
              queryRunner
                .release()
                .then(() => {
                  this.logger.log('Search dogs query runner released');
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
          this.logger.error('queryRunner.connect() error:', err);
          subscriber.error(err);
        });

      // Cleanup effect
      return () => {
        if (!isQueryComplete && processId) {
          // queryRunner.release(); maybe?
          this.logger.log('Cleanup: cancelling query for PID:', processId);
          // We must cancel the query using a new query runner :(
          const cancelRunner = this.dataSource.createQueryRunner();
          cancelRunner
            .connect()
            .then(() => {
              return cancelRunner
                .query('SELECT pg_cancel_backend($1)', [processId])
                .then(() =>
                  this.logger.log(
                    'Successfully cancelled query for PID:',
                    processId,
                  ),
                );
            })
            .catch((err) => {
              this.logger.error('Failed to cancel query:', err);
              subscriber.error(err);
            })
            .finally(() => {
              void cancelRunner.release();
              this.logger.log('Cancel query runner released');
            });
        }
      };
      // Note: the below code does NOT appear to cancel the database query!
      // if (!isQueryComplete) {
      //   queryRunner.release();
      // }
    });
  }

  searchDogsByName(name: string): Promise<Dog[]> {
    try {
      return this.dogRepository.find({
        where: {
          name: ILike(`%${name}%`),
        },
      });
    } catch (error) {
      this.logger.error('Failed to search dogs:', error);
      throw error;
    }
  }

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
}
