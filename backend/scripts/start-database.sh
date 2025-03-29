#!/bin/bash

IMAGE_NAME="postgres:latest"
echo "Running start-database.sh..."

echo "Finding environment file..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=""

for path in "$SCRIPT_DIR/../../config/database.env" "$SCRIPT_DIR/../config/database.env"; do
    if [ -f "$path" ]; then
        ENV_FILE="$path"
        break
    fi
done

if [ -z "$ENV_FILE" ]; then
    echo "Error: database.env not found in either root or backend/config directory"
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

if [[ $(docker ps -q -f name=$CONTAINER_NAME) ]]; then
    echo "PostgreSQL container is already running"
    exit 0
fi

echo "Starting PostgreSQL container..."
echo "External port: $PORT (mapped to container's internal port 5432)"
echo "Using env file: $ENV_FILE"

docker run -d \
    -p "$PORT:5432" \
    --env-file "$ENV_FILE" \
    --name "$CONTAINER_NAME" \
    "$IMAGE_NAME"
