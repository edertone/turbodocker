# Local AI Chat

Local AI chat powered by **Ollama** + **Open WebUI** via Docker Compose.

## What's Included

- **Ollama** — LLM inference server with GPU acceleration (port `11434`)
- **Open WebUI** — ChatGPT-style web interface (port `3000`)
- **Auto-downloaded models:** `llama3.1:8b` (~4.7 GB) and `llama3.2:3b` (~2 GB)

All data is stored locally in the project folder:

- `./ollama_data/` — downloaded models
- `./open_webui_data/` — chat history and settings

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **GPU:** NVIDIA GPU + [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
- **CPU-only:** Remove the `deploy.resources` block from the `ollama` service in `docker-compose.yml`

## Usage

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Stop and delete all local data
docker compose down ; rm -rf ollama_data open_webui_data
```

Open **<http://localhost:3000>** — first visit requires creating a local admin account.

## Monitoring

```bash
# Model pull progress (first launch)
docker compose logs -f ollama-init

# Ollama server logs
docker compose logs -f ollama

# List downloaded models
docker exec ollama ollama list

# Check running models
docker exec ollama ollama ps

# Container resource usage (CPU, memory)
docker stats

# GPU usage
nvidia-smi
nvidia-smi --loop=1          # live refresh
docker exec ollama nvidia-smi # from inside the container
```

## Pull Additional Models

```bash
docker exec ollama ollama pull <model-name>
```

Browse models at [ollama.com/library](https://ollama.com/library).

## Troubleshooting

| Problem | Solution |
| --------- | ---------- |
| GPU not detected | Install NVIDIA Container Toolkit and restart Docker |
| GPU error on CPU-only setup | Remove the `deploy.resources` block from `ollama` service |
| Models not downloading | Run `docker compose logs -f ollama-init` |
| WebUI can't connect to Ollama | Check `docker compose ps` — ollama must be running |
| Out of disk space | Remove models: `docker exec ollama ollama rm <model>` |
