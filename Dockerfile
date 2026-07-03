# Use the official Microsoft Playwright image which has Node, Playwright, and all system dependencies pre-configured
FROM mcr.microsoft.com/playwright:v1.47.0-noble

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (since Playwright is pre-installed in the base image, this is extremely fast)
RUN npm ci

# Copy TypeScript source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY .env* ./

# Build the TypeScript application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=0

# Start the application using start.js
CMD ["node", "start.js"]