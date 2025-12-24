# PHP 7, Apache 2.4 docker image with volume mounted virtual hosts support

## Build & Run Locally

## Run tests

## Publish to docker hub

- Make sure docker is running
- Open a **power shell** terminal at the php7-apache-vhosts docker folder
- Run all this code at once:

```
docker login; `
$VERSION = (Get-Content VERSION).Trim(); `
docker build -t edertone/php7-apache-vhosts:$VERSION .; `
docker tag edertone/php7-apache-vhosts:$VERSION; `
docker push edertone/php7-apache-vhosts:$VERSION
```