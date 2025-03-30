import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { Dog } from './entities/dog.entity';

interface SeedResponse {
  seededCount: number;
  finalCount: number;
}

@Controller('v1/dogs')
@ApiTags('Dogs')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('seed')
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
    type: Object,
  })
  seedDogs(@Query('count') count: number): Promise<SeedResponse> {
    return this.appService.seedDogs(count);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search dogs' })
  @ApiQuery({
    name: 'name',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of dogs',
    type: [Dog],
  })
  searchDogs(@Query('name') name: string): Promise<Dog[]> {
    return this.appService.searchDogsByName(name);
  }

  @Get('cancelable/search')
  @ApiOperation({
    summary: 'Search dogs (cancelable database query)',
  })
  @ApiQuery({
    name: 'name',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of dogs. Query can be cancelled by closing the connection.',
    type: [Dog],
  })
  searchDogsWithCancelableQuery(
    @Query('name') name: string,
  ): Observable<Dog[]> {
    return this.appService.searchDogsByNameOrTerminatePidOnClose(name);
  }
}
