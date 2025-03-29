import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const nextSpy = jest.fn();
      const completeSpy = jest.fn();

      appController.getHello().subscribe({
        next: nextSpy,
        complete: completeSpy,
      });

      expect(nextSpy).not.toHaveBeenCalled();
      expect(completeSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      expect(nextSpy).toHaveBeenCalledWith('Hello World!');
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
