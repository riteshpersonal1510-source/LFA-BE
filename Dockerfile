# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Create app directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

# Switch to non-root user for security
USER node

# Copy package files first for better Docker layer caching
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy TypeScript source code
COPY --chown=node:node src/ ./src/
COPY --chown=node:node tsconfig.json ./

# Copy configuration files
COPY --chown=node:node .env* ./

# Install dev dependencies temporarily for building
RUN npm ci

# Build the TypeScript application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories
RUN mkdir -p logs uploads/reports/html uploads/reports/pdf

# Install Playwright and Chromium
RUN npx playwright install chromium

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node health-check.js || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=0

# Start the application using the custom startup script
CMD ["node", "start.js"]