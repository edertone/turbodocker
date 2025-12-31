# File Tools Microservice

This Dockerized microservice provides general-purpose tools for file manipulation via HTTP API endpoints on port 5001.

All endpoints accept POST variables as either `multipart/form-data` (for file uploads) or `application/json` (for string or base64-encoded data). String and numeric fields can be sent as form fields or JSON properties. See each endpoint for required and optional parameters.

## Docker image configuration

The image exposes port `5001` for the API and uses an internal Redis instance for caching. You can configure it using the following environment variables:

- `REDIS_MAX_MEMORY`: Sets the maximum memory for Redis (e.g., `500mb`, `1gb`). Defaults to `500mb`.
- `REDIS_PERSISTENCE_ENABLED`: Set to `true` to enable Redis persistence. Defaults to `false`, running Redis in-memory only.
- `REDIS_LOG_LEVEL`: Sets the Redis log level (e.g., `notice`, `warning`). Defaults to logging nothing.

**Example `docker-compose.yml`**

```yaml
services:
    file-tools:
        image: edertone/file-tools:X.X.X
        ports:
            - '5001:5001'
        volumes:
            # Persist Redis data on the host if REDIS_PERSISTENCE_ENABLED is true
            - my/local/folder:/redis-data
        environment:
            - REDIS_MAX_MEMORY=1gb
            - REDIS_PERSISTENCE_ENABLED=true # Enable persistence
            - REDIS_LOG_LEVEL=notice
```

## API Documentation

- [Image API Endpoints](./docs/image-api.md)

- [PDF API Endpoints](./docs/pdf-api.md)

- [Cache API Endpoints](./docs/cache-api.md)

## Development documentation

- [Development, testing and deployment documentation](./docs/develop-test-publish.md)
