FROM alpine:3.22
# Install system dependencies including Node.js and Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    ca-certificates \
    nodejs \
    ghostscript \
    poppler-utils \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    font-noto-extra \
    && adduser -D converter

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=converter:converter *.js .

# Switch to non-root user
USER converter

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["node", "server.js"]
