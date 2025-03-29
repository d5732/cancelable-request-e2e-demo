import { Controller, Get, Post, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { Dog } from './entities/dog.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Observable<Dog[]> {
    return this.appService.getDogsOrTerminatePidOnClose();
  }

  @Post('/seed')
  seedDogs(@Query('count') count: number): Promise<void> {
    return this.appService.seedDogs(count);
  }
}
