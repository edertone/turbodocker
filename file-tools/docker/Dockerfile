FROM alpine:3.22

# Tell node we are in production mode
ENV NODE_ENV=production

# Install system dependencies
# chromium: for html-to-pdf
# ghostscript: for pdf-to-jpg
# poppler-utils: for pdfinfo (validation/counting)
# nodejs & npm: for the server
RUN apk add --no-cache \
    chromium \
    nss \
    ca-certificates \
    nodejs \
    npm \
    ghostscript \
    poppler-utils \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    font-noto-extra \
    && adduser -D converter

WORKDIR /app

# Copy dependency definitions first (better caching)
COPY --chown=converter:converter package.json .

# Install Node dependencies
RUN npm install --omit=dev

# Copy application code
COPY --chown=converter:converter server.js server-helper.js ./

# Switch to non-root user
USER converter

EXPOSE 5001

CMD ["node", "server.js"]