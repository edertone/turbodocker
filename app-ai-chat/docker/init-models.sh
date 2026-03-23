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

# DeepSeek-R1 (8 Billion parameters)
# A powerful "reasoning" model that supports deep thinking processes. Requires ~4.7GB on disk and 6-8GB VRAM for smooth generation.
# Excellent for complex logic, coding, and step-by-step problem solving.
pull_model "deepseek-r1:8b"

# Gemma 3 (12 Billion parameters)
# Bleeding-edge generation from Google. Fills almost exactly 8GB of VRAM. Slower context processing but massive intelligence for its size.
pull_model "gemma3:12b"

# this model is very large and will only work with 16GB vram GPUs, so it's commented out by default. Uncomment if you want to pull it.
# gpt-oss:20b
# OpenAI’s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases.
# pull_model "gpt-oss:20b"

# this model is very large and will only work with 24GB vram GPUs, so it's commented out by default. Uncomment if you want to pull it.
# gemma3:27b
# The current, most capable model that runs on a single GPU
# pull_model "gemma3:27b"

echo "All models ready."
