# File Tools Microservice

## Build & Run Locally

Open a cmd at the file-tools/docker folder and run:

```batch
docker build -t file-tools .
docker run -p 5001:5001 file-tools
```

## Run tests

Make sure the container is running on your local machine, and packages are installed (npm ci):

```
npm run test
```

## Publish to docker hub

- Make sure docker is running
- Open a **power shell** terminal at the file-tools/docker folder
- Run all this code at once:

```powershell
docker login; `
$VERSION = (Get-Content VERSION).Trim(); `
docker build -t edertone/file-tools:$VERSION .; `
docker tag edertone/file-tools:$VERSION; `
docker push edertone/file-tools:$VERSION
```