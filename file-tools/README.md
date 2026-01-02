# File Tools Microservice

This Dockerized microservice provides general-purpose tools for file manipulation via HTTP API endpoints on port 5001.

## Docker image configuration

The image exposes all the API endpoints on port `5001`.
When using cache features, a volume must be mounted to store the cached data across container restarts.

**Example `docker-compose.yml`**

```yaml
services:
    file-tools:
        image: edertone/file-tools:X.X.X
        ports: # Remove if you don't want external access to this container
            - '5001:5001'
        volumes:
            # Persist cache data on the host
            - ./my/local/cache-folder:/app/file-tools-cache
```

## API Documentation

- [Image API Endpoints](./docs/image-api.md)

- [PDF API Endpoints](./docs/pdf-api.md)

- [Cache API Endpoints](./docs/cache-api.md)

## Development documentation

- [Development, testing and deployment documentation](./docs/develop-test-publish.md)
