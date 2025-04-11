#!/bin/bash

IMAGE_NAME="postgres:latest"
echo "Running start-database.sh..."

echo "Finding environment file..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=""

# Look for database.env in backend/config directory
for path in "$SCRIPT_DIR/../../config/database.env" "$SCRIPT_DIR/../config/database.env"; do
    if [ -f "$path" ]; then
        ENV_FILE="$path"
        break
    fi
done

if [ -z "$ENV_FILE" ]; then
    echo "Error: backend/config/database.env not found in $SCRIPT_DIR directory"
    exit 1
fi

echo "Loading environment variables..."
CONTAINER_NAME=$(sed -n 's/^POSTGRES_CONTAINER_NAME=//p' "$ENV_FILE" | tr -d ' \r')
PORT=$(sed -n 's/^POSTGRES_PORT=//p' "$ENV_FILE" | tr -d ' \r')

echo "Validating environment variables..."
for var in CONTAINER_NAME PORT; do
    if [ -z "${!var}" ]; then
        echo "Error: $var not found in $ENV_FILE"
        exit 1
    fi
done

# Check if container exists (running or stopped)
if [[ $(docker ps -a -q -f name=$CONTAINER_NAME) ]]; then
    echo "PostgreSQL container exists. Checking if it's running..."
    if [[ $(docker ps -q -f name=$CONTAINER_NAME) ]]; then
        echo "PostgreSQL container is already running"
        exit 0
    else
        echo "Container exists but is stopped. Starting it..."
        docker start $CONTAINER_NAME
        exit 0
    fi
fi

echo "Starting PostgreSQL container..."
echo "External port: $PORT"
echo "Using env file: $ENV_FILE"

docker run -d \
    -p "$PORT:5432" \
    --env-file "$ENV_FILE" \
    --name "$CONTAINER_NAME" \
    "$IMAGE_NAME"
