#!/usr/bin/env node

/**
 * Production startup script for Lead Finder Backend
 * Handles graceful startup with proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function checkPrerequisites() {
  log(colors.blue, '🔍 Checking prerequisites...');
  
  // Check if dist directory exists
  if (!fs.existsSync('./dist')) {
    log(colors.red, '❌ dist directory not found. Run "npm run build" first.');
    return false;
  }
  
  // Check if main app file exists
  if (!fs.existsSync('./dist/app.js')) {
    log(colors.red, '❌ Main application file (dist/app.js) not found.');
    return false;
  }
  
  // Check environment variables
  require('dotenv').config();
  
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    log(colors.red, `❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  log(colors.green, '✅ All prerequisites satisfied');
  return true;
}

function setupEnvironment() {
  log(colors.blue, '⚙️ Setting up environment...');
  
  // Set default NODE_ENV if not specified
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    log(colors.yellow, '⚠️ NODE_ENV not set, defaulting to "production"');
  }
  
  // Set Playwright environment
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
  }
  
  // Set default port
  if (!process.env.PORT) {
    process.env.PORT = '8000';
  }
  
  log(colors.green, `✅ Environment: ${process.env.NODE_ENV}`);
  log(colors.green, `✅ Port: ${process.env.PORT}`);
}

function handleGracefulShutdown() {
  log(colors.blue, '🛡️ Setting up graceful shutdown handlers...');
  
  let isShuttingDown = false;
  
  const shutdown = (signal) => {
    if (isShuttingDown) {
      log(colors.yellow, '⚠️ Shutdown already in progress...');
      return;
    }
    
    isShuttingDown = true;
    log(colors.yellow, `🛑 Received ${signal}, shutting down gracefully...`);
    
    // Give the app time to clean up
    setTimeout(() => {
      log(colors.red, '💥 Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('uncaughtException', (error) => {
    log(colors.red, `💥 Uncaught Exception: ${error.message}`);
    log(colors.red, error.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(colors.red, `💥 Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // Don't exit on unhandled rejection in production, let the app handle it
  });
}

function startApplication() {
  log(colors.blue, '🚀 Starting Lead Finder Backend...');
  
  try {
    // Use absolute path resolution to avoid working directory issues
    const appPath = path.resolve(__dirname, 'dist', 'app.js');
    
    // Clear require cache to ensure fresh start
    delete require.cache[appPath];
    
    // Start the application
    require(appPath);
    
    log(colors.green, '✅ Application started successfully');
    
  } catch (error) {
    log(colors.red, `❌ Failed to start application: ${error.message}`);
    log(colors.red, error.stack);
    process.exit(1);
  }
}

function printStartupInfo() {
  log(colors.bright, '==========================================');
  log(colors.bright, '🎯 Lead Finder Backend');
  log(colors.bright, '==========================================');
  log(colors.reset, `Environment: ${process.env.NODE_ENV}`);
  log(colors.reset, `Port: ${process.env.PORT}`);
  log(colors.reset, `Node Version: ${process.version}`);
  log(colors.reset, `Platform: ${process.platform}`);
  log(colors.reset, `Architecture: ${process.arch}`);
  log(colors.reset, `Working Directory: ${process.cwd()}`);
  log(colors.reset, `Timestamp: ${new Date().toISOString()}`);
  log(colors.bright, '==========================================');
}

async function main() {
  printStartupInfo();
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  // Setup environment
  setupEnvironment();
  
  // Setup graceful shutdown
  handleGracefulShutdown();
  
  // Start the application
  startApplication();
  
  // Log successful startup
  log(colors.green, '🎉 Lead Finder Backend is running!');
  log(colors.blue, `📡 API available at: http://localhost:${process.env.PORT}`);
  log(colors.blue, `🏥 Health check: http://localhost:${process.env.PORT}/health`);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Lead Finder Backend Startup Script

Usage: node start.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  NODE_ENV       Environment (development/production)
  PORT           Port number (default: 8000)
  MONGODB_URI    MongoDB connection string (required)
  JWT_SECRET     JWT secret key (required)

Examples:
  node start.js
  NODE_ENV=development PORT=3000 node start.js
`);
  process.exit(0);
}

main().catch(error => {
  log(colors.red, `❌ Startup script failed: ${error.message}`);
  process.exit(1);
});