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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
