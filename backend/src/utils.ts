export function createLogger<T extends { constructor: Function }>(o: T) {
  return ['debug', 'log', 'warn', 'error'].reduce(
    (logger, method) => ({
      ...logger,
      [method]: (...args: any[]) => {
        console.log(`[${o.constructor.name}]`, ...args);
      },
    }),
    {} as Pick<Console, 'debug' | 'log' | 'warn' | 'error'>,
  );
}
