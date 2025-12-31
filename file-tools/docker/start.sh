#!/bin/sh
# Start the Redis server in the background
redis-server --daemonize no &

# Start the Node.js server
node server.js
