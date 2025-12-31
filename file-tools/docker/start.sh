#!/bin/sh

# Start Redis in the background
# Build the redis-server command with optional arguments

REDIS_CMD="redis-server --daemonize no"

# Configure maxmemory (defaulting to 500mb)
MAX_MEMORY=${REDIS_MAX_MEMORY:-500mb}
REDIS_CMD="$REDIS_CMD --maxmemory $MAX_MEMORY --maxmemory-policy allkeys-lru"

# Configure Redis data directory for persistence
if [ -n "$REDIS_DATA_DIR" ]; then
    echo "Redis persistence is enabled. Data will be saved in $REDIS_DATA_DIR"
    REDIS_CMD="$REDIS_CMD --save 900 1 --dir $REDIS_DATA_DIR --dbfilename dump.rdb"
else
    # Disable RDB snapshotting completely to ensure Redis runs only in RAM.
    echo "Redis persistence is disabled. Redis will run in-memory only."
    REDIS_CMD="$REDIS_CMD --save \"\""
fi

# Configure log level. Log nothing by default.
if [ -z "$REDIS_LOG_LEVEL" ]; then
  REDIS_CMD="$REDIS_CMD --logfile /dev/null"
else
  REDIS_CMD="$REDIS_CMD --loglevel $REDIS_LOG_LEVEL"
fi

echo "Starting Redis with maxmemory: $MAX_MEMORY"
    
# Start Redis with the constructed command
eval $REDIS_CMD &

# Start the Node.js server
node server.js