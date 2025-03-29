#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_FILE=""
if [ -f "$SCRIPT_DIR/../../config/database.env" ]; then
    ENV_FILE="$SCRIPT_DIR/../../config/database.env"
elif [ -f "$SCRIPT_DIR/../config/database.env" ]; then
    ENV_FILE="$SCRIPT_DIR/../config/database.env"
else
    echo "Error: database.env not found in either root or backend/config directory"
    exit 1
fi

CONTAINER_NAME=$(sed -n 's/^POSTGRES_CONTAINER_NAME=//p' "$ENV_FILE" | tr -d ' \r')
PORT=$(sed -n 's/^POSTGRES_PORT=//p' "$ENV_FILE" | tr -d ' \r')

if [ -z "$CONTAINER_NAME" ]; then
    echo "Error: POSTGRES_CONTAINER_NAME not found in $ENV_FILE"
    exit 1
fi

if [ -z "$PORT" ]; then
    echo "Error: POSTGRES_PORT not found in $ENV_FILE"
    exit 1
fi

IMAGE_NAME="postgres:latest"

if [[ $(docker ps -q -f name=$CONTAINER_NAME) ]]; then
    echo "PostgreSQL container is already running. Skipping PostgreSQL start commands."
else
    echo "Starting PostgreSQL container..."
    echo "External port: $PORT (mapped to container's internal port 5432)"
    echo "Using env file: $ENV_FILE"
    docker run -d \
        -p "$PORT:5432" \
        --env-file "$ENV_FILE" \
        --name "$CONTAINER_NAME" \
        "$IMAGE_NAME"
fi
