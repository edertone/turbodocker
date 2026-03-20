# Vaultwarden Docker app

Local instance of [Vaultwarden](https://github.com/dani-garcia/vaultwarden), an unofficial Bitwarden compatible server written in Rust.

<https://www.vaultwarden.net/>

## Features

- **Vaultwarden server**: Running on localhost:8083
- **File Attachments**: Enabled by default
- **Persistent Data**: Stored locally in the ./vw-data directory

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system.
- Windows (as the provided scripts are .bat files).

### Managing the Server

You can easily manage the server using the provided batch scripts:

- **Start the server**: Run start.bat
- **Stop the server**: Run stop.bat
- **Update Vaultwarden**: Run update to latest version.bat to pull the latest image and recreate the container.

## Configuration Details

- **Port:** HTTP access on 8083 (Standard Bitwarden clients require HTTPS, so you should place this behind a reverse proxy like NGINX or Caddy for external access or use localhost).
- **Volumes:** All user data, databases, and attachments are persisted in ./vw-data.
