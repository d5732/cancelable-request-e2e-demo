import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appDataSourceOptions } from '../../../datasource';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Dog } from './entities/dog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dog]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...appDataSourceOptions,
        autoLoadEntities: true,
      }),
    }),
    // This additional dataSource can be used as a fallback for
    // pg_cancel_backend when primary dataSource's connection pool is full and
    // has no idle connections
    TypeOrmModule.forRootAsync({
      name: 'fallback',
      useFactory: () => ({
        ...appDataSourceOptions,
        autoLoadEntities: true,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
