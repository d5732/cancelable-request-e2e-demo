# E2E Cancelable Requests

Demonstrates rxjs observable used to cancel a running query in postgres

## Request Flow:

1. User Types in Input → onChange Event → HTTP Request
2. UnsubscribeOnCloseInterceptor:
   - Listens for request 'close' event
   - Creates Observable with takeUntil(close)
3. AppService.getDogsOrTerminatePidOnClose():
   - Creates Observable with cleanup function
   - Manages Database Connection 1
   - Handles query execution
   - Provides cleanup function for cancellation
4. When Request Closes:
   - Interceptor's takeUntil triggers unsubscribe
   - AppService's cleanup function runs
   - If query hasn't completed (!dogs):
     - Create Connection 2
     - Cancel query using PID from Connection 1
     - Release Connection 2
