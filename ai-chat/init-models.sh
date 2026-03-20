#!/bin/sh
set -e

export OLLAMA_HOST="http://ollama:11434"

echo "Waiting for Ollama to be ready..."
until ollama list > /dev/null 2>&1; do
  sleep 10
done
echo "Ollama is ready."

pull_model() {
  model="$1"
  if ollama list | grep -q "$model"; then
    echo "$model already pulled, skipping."
  else
    echo "Pulling $model (this may take a while)..."
    ollama pull "$model"
    echo "Done pulling $model."
  fi
}

pull_model "llama3.1:8b"
pull_model "llama3.2:3b"

echo "All models ready."
