# Cancelable Request Flow

This demo shows a resource optimization approach where unnecessary work is gracefully canceled when HTTP request are canceled by the frontend client.

## Request Flow

![Request Flow](https://i.ibb.co/mrkR30RM/excalidraw-claymate.gif)

1. **User Input**

   - User types in input field
   - Triggers onChange event
   - Initiates HTTP request

2. **Request Interception**

   - Listens for request 'close' event
   - Creates Observable with `takeUntil(close)`

3. **Service Layer**

   - Creates Observable with cleanup function
   - Manages Database Connection 1
   - Handles query execution
   - Provides cleanup function for cancellation

4. **Request Cancellation**
   When the request closes:
   - Interceptor's `takeUntil` triggers unsubscribe
   - AppService's cleanup function runs
   - If query hasn't completed:
     - Creates Connection 2
     - Cancels query using PID from Connection 1
     - Releases Connection 2

## Requirements

- node.js
- npm
- nvm
- docker

## Getting Started

- In project root, open a terminal and run the following commands:

```
cp backend/config/database.env.example backend/config/database.env;
# vim backend/config/database.env; # optional: customize database env vars
nvm use;
npm run install:all;
npm run start;
```

- Then, open your web browser and navigate to http://localhost:5173

## References

- Based on https://medium.com/marmicode/end-to-end-http-request-cancelation-with-rxjs-nestjs-909389c9d4bd
