import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { Dog } from './entities/dog.entity';

@Controller()
@ApiTags('dogs')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get dogs with cancelable query' })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of dogs. Query can be cancelled by closing the connection.',
    type: [Dog],
  })
  getHello(): Observable<Dog[]> {
    return this.appService.getDogsOrTerminatePidOnClose();
  }

  @Post('/seed')
  @ApiOperation({ summary: 'Seed the database with dogs' })
  @ApiQuery({
    name: 'count',
    required: true,
    type: Number,
    description: 'Number of dogs to seed',
  })
  @ApiResponse({
    status: 200,
    description: 'Seeds the database with the specified number of dogs',
    type: Number,
  })
  seedDogs(@Query('count') count: number): Promise<{
    seededCount: number;
    finalCount: number;
  }> {
    return this.appService.seedDogs(count);
  }
}
