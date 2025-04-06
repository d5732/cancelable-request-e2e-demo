import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client as _PgClient } from 'pg';
import { Observable } from 'rxjs';
import { DataSource, ILike, Repository } from 'typeorm';
import { createLogger } from '../../utils';
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
  ) {}
  logger = createLogger(this);

  searchDogsByNameOrTerminatePidOnClose(name: string): Observable<Dog[]> {
    return new Observable<Dog[]>((subscriber) => {
      const queryRunner = this.dataSource.createQueryRunner();
      let processId: number | null = null;
      let isComplete = false;

      // Establish a new database connection
      queryRunner
        .connect()
        .then((dbClient: PgClient) => {
          // console.log({ dbClient });

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
              isComplete = true;
              this.logger.log(`Next'ing ${rows.length} dogs`);
              subscriber.next(rows);
              subscriber.complete();
              this.logger.log('Subscriber completed');
            })
            .catch((err) => {
              isComplete = true;
              this.logger.error('Failed to query dogs:', err);
              subscriber.error(err);
            });
        })
        .catch((err) => {
          this.logger.error('queryRunner.connect() error:', err);
          subscriber.error(err);
        });

      // Cleanup effect
      return () => {
        if (!isComplete && processId) {
          this.logger.log(
            'Cleanup effect: cancelling query for PID:',
            processId,
          );
          this.dataSource
            .query('SELECT pg_cancel_backend($1)', [processId])
            .then(() => {
              this.logger.log(
                'Cleanup effect: successfully cancelled query for PID:',
                processId,
              );
            })
            .catch((err) => {
              this.logger.error('Cleanup effect: failed to cancel query:', err);
            });
        }
        // Release the query runner now. Waiting until the end to release the
        // query runner should prevent the edge case where the PID was quickly
        // recycled to start handling a new, different query. We do not want to
        // errantly cancel a new query using the same PID (i.e. cancel the wrong
        // query).
        queryRunner
          .release()
          .then(() => {
            this.logger.log('Cleanup effect: released query runner');
          })
          .catch((err) => {
            this.logger.error(
              'Cleanup effect: failed to release query runner:',
              err,
            );
          });
      };
    });
  }

  searchDogsByName(name: string): Promise<Dog[]> {
    try {
      return this.dogRepository.find({
        where: {
          name: ILike(`%${name}%`),
        },
        take: 500,
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
