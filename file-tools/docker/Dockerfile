# ------------------------------
# Stage 1: Build Stage
# ------------------------------
FROM alpine:3.22 AS builder

WORKDIR /app

# Install npm just for the installation process
RUN apk add --no-cache npm

# Copy package files
COPY package*.json ./

# Install production dependencies only
# This avoids installing devDependencies and creates a clean node_modules
RUN npm install --omit=dev

# ------------------------------
# Stage 2: Production Stage
# ------------------------------
FROM alpine:3.22

# Tell node we are in production mode
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install Runtime Dependencies
# 1. Chromium & Deps: For HTML-to-PDF
# 2. Nodejs: To run the server (npm is NOT installed to save space)
# 3. Ghostscript & Poppler: For PDF manipulation
# 4. imagemagick: Required for image conversion
# 5. Fonts: 
#    - ttf-dejavu: Much smaller fallback for Latin/Western text than font-noto
#    - font-noto-cjk: Required for Chinese/Japanese/Korean (Heavy but necessary)
#    - font-noto-emoji: For emojis
RUN apk add --no-cache \
    redis \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    nodejs \
    ghostscript \
    poppler-utils \
    imagemagick \
    ttf-freefont \
    font-noto-cjk \
    font-noto-emoji \
    && adduser -D converter

# Copy node_modules from the builder stage
COPY --from=builder --chown=converter:converter /app/node_modules ./node_modules

# Copy application files
COPY --chown=converter:converter package.json server.js server-helper.js start.sh ./

# Switch to non-root user
USER converter

EXPOSE 5001

# Use exec form for CMD to handle signals correctly
CMD ["./start.sh"]