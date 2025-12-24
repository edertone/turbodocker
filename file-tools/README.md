# PDF Tools Microservice

This Dockerized microservice provides general-purpose PDF manipulation tools via HTTP API endpoints on port 5001.

All endpoints accept POST variables as either `multipart/form-data` (for file uploads) or `application/json` (for string or base64-encoded data). For file fields (such as `pdf`), use a file upload with `multipart/form-data` or provide a base64-encoded string in JSON. String and numeric fields can be sent as form fields or JSON properties. See each endpoint for required and optional parameters.

---

## API Documentation

- [PDF API Endpoints](./docs/pdf-api.md)

## Build & Run Locally

```
docker build -t pdf-tools . && docker run -p 5001:5001 pdf-tools
```

## Run tests

Make sure the container is running on your local machine, and packages are installed (npm ci):

```
npm run test
```

## Publish to docker hub

Open a cmd at the pdf-tools docker image folder and run:

```
docker login
docker build -t edertone/pdf-tools:latest .
docker push edertone/pdf-tools:latest
```

---