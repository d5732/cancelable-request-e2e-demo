# E2E Cancelable Requests

This demo shows a resource optimization approach where unnecessary work is gracefully canceled when an HTTP request is canceled by the frontend client.

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
     - Manages Database Connection 2
     - Cancels query using PID from Connection 1

## Requirements

- node.js
- npm
- nvm
- docker

## Getting Started

# cp backend/config/database.env.example backend/config/database.env
# # optional: vim backend/config/database.env;
# docker-compose up --build;

Open http://localhost:5173 in a browser