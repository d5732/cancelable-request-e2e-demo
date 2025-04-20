import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Client as _PgClient } from 'pg';
import { Observable } from 'rxjs';
import { DataSource, ILike, Repository } from 'typeorm';
import { createLogger, escapeLikePattern } from '../../utils';
import { Dog } from './entities/dog.entity';

interface PgClient extends _PgClient {
  // client.processID should be available at runtime. If not, you would need to
  // add a preliminary query `SELECT pg_backend_pid()` before the real query to
  // save the processId.
  processID: number;
}

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Dog)
    private dogRepository: Repository<Dog>,
    private dataSource: DataSource,
@InjectDataSource('fallback')
    private fallbackDataSource: DataSource,
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
          // Cancel the search dogs query
          this.dataSource
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
}
