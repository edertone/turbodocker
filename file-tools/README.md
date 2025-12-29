# File Tools Microservice

This Dockerized microservice provides general-purpose tools for file manipulation via HTTP API endpoints on port 5001.

All endpoints accept POST variables as either `multipart/form-data` (for file uploads) or `application/json` (for string or base64-encoded data). For file fields (such as `pdf`), use a file upload with `multipart/form-data` or provide a base64-encoded string in JSON. String and numeric fields can be sent as form fields or JSON properties. See each endpoint for required and optional parameters.

## API Documentation

- [PDF API Endpoints](./docs/pdf-api.md)

## Development documentation

- [Development, testing and deployment documentation](./docs/develop-test-publish.md)
