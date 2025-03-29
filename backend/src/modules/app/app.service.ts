import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { createLogger } from '../../utils';
import { Dog } from './entities/dog.entity';

interface PgBackendPid {
  pid: number;
}

@Injectable()
@ApiTags('dogs')
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
  @ApiOperation({ summary: 'Get dogs with cancelable query' })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of dogs. Query can be cancelled by closing the connection.',
    type: [Dog],
  })
  getDogsOrTerminatePidOnClose(): Observable<Dog[]> {
    return new Observable<Dog[]>((subscriber) => {
      const queryRunner = this.dataSource.createQueryRunner();

      let processId: number | null = null;
      let dogs: Dog[];
      // Establish a new database connection
      void queryRunner.connect().then(() => {
        this.logger.log('Connected to database. Querying for PID...');

        // Get the process ID of the current connection
        void queryRunner
          .query('SELECT pg_backend_pid() as pid')
          .then((rows: PgBackendPid[]) => {
            // save the process id so we can cancel the query later
            processId = rows[0].pid;
            this.logger.log('Got PID:', processId);

            // query for dogs
            queryRunner
              .query('SELECT * FROM dogs where name ilike $1 limit 500', [
                '%name%',
              ])
              .then((rows: Dog[]) => {
                dogs = rows;
                this.logger.log(`Next'ing ${rows?.length} dogs`);
                subscriber.next(rows);
                subscriber.complete();
                this.logger.log('Subscriber completed');
              })
              .catch((err) => {
                this.logger.error('Failed to query dogs:', err);
              })
              .finally(() => {
                void queryRunner.release();
                this.logger.log('Query runner released');
              });
          });
      });

      // cleanup effect
      return () => {
        if (!dogs) {
          this.logger.log('Cleanup: cancelling query for PID:', processId);
          // we must cancel the query using a new query runner :(
          const queryRunner = this.dataSource.createQueryRunner();
          queryRunner
            .connect()
            .then(() => {
              if (!processId) {
                this.logger.log('No PID available to cancel');
                return;
              }
              return queryRunner
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
            })
            .finally(() => {
              void queryRunner.release();
              this.logger.log('Query runner released');
            });
        }
      };
    });
  }

  @ApiOperation({ summary: 'Seed the database with dogs' })
  @ApiResponse({
    status: 200,
    description: 'Seeds the database with the specified number of dogs',
    type: Number,
  })
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
