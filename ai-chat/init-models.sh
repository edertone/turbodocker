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

# Llama 3.1 (8 Billion parameters)
#An excellent all-around model offering a great balance of logic, coding ability, and speed. Fits well entirely inside an 8GB VRAM GPU.
pull_model "llama3.1:8b"

# Llama 3.2 (3 Billion parameters)
# Highly optimized for speed and maximum VRAM efficiency. Perfect for simple tasks or huge context windows, though less capable at deep logic.
pull_model "llama3.2:3b"

# Gemma 2 (9 Billion parameters)
# Google's model that punches above its weight class. Offers incredibly strong logic and reasoning while just barely fitting inside an 8GB VRAM GPU.
pull_model "gemma2:9b"

# Gemma 3 (12 Billion parameters)
# Bleeding-edge generation from Google. Fills almost exactly 8GB of VRAM. Slower context processing but massive intelligence for its size.
pull_model "gemma3:12b"

# this model is very large and not needed for most use cases, so it's commented out by default. Uncomment if you want to pull it.
# Mixtral 8x7B
# A massive "Mixture of Experts" model that requires 30-45GB of memory. It will utilize system RAM (slower generation) but offers near GPT-4 level intelligence.
# pull_model "mixtral:8x7b"

echo "All models ready."
