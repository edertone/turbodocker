# File Tools Microservice

## Build & Run Locally

Open a cmd at the file-tools docker folder and run:

```
docker build -t file-tools . && docker run -p 5001:5001 file-tools
```

## Run tests

Make sure the container is running on your local machine, and packages are installed (npm ci):

```
npm run test
```

## Publish to docker hub

Open a cmd at the file-tools docker folder and run:

```
docker login
docker build -t edertone/file-tools:latest .
docker push edertone/file-tools:latest
```