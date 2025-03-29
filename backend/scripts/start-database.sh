#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $(docker ps -q -f name=e2e-abort-controller-postgres) ]]; then
    echo "PostgreSQL container is already running. Skipping PostgreSQL start commands."
else
    # Ensure image is built before running
    if [[ "$(docker images -q e2e-abort-controller-postgres)" == "" ]]; then
        echo "Building PostgreSQL image..."
        docker build --pull --rm -f 'database.dockerfile' -t 'e2e-abort-controller-postgres:latest' .
    fi

    # Find database.env file in either root or backend directory
    ENV_FILE=""
    if [ -f "$SCRIPT_DIR/../../config/database.env" ]; then
        ENV_FILE="$SCRIPT_DIR/../../config/database.env"
    elif [ -f "$SCRIPT_DIR/../config/database.env" ]; then
        ENV_FILE="$SCRIPT_DIR/../config/database.env"
    else
        echo "Error: database.env not found in either root or backend/config directory"
        exit 1
    fi

    # Read external port from database.env (this is the port your application will connect to)
    EXTERNAL_PORT=$(grep POSTGRES_PORT "$ENV_FILE" | cut -d '=' -f2)
    if [ -z "$EXTERNAL_PORT" ]; then
        echo "Error: POSTGRES_PORT not found in $ENV_FILE"
        exit 1
    fi

    # Run the image mapping the external port to container's internal port 5432
    echo "Starting PostgreSQL container..."
    echo "External port: $EXTERNAL_PORT (mapped to container's internal port 5432)"
    echo "Using env file: $ENV_FILE"
    docker run -d \
        -p "$EXTERNAL_PORT:5432" \
        --env-file "$ENV_FILE" \
        --name e2e-abort-controller-postgres \
        e2e-abort-controller-postgres
fi
