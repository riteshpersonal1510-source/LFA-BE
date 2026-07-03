#!/usr/bin/env node

/**
 * Robust server entry point for deployment platforms
 * Ensures correct working directory and path resolution
 */

const path = require('path');
const fs = require('fs');

// Ensure we're in the correct working directory
const backendDir = __dirname;
process.chdir(backendDir);

// Resolve the absolute path to the compiled app
const appPath = path.resolve(backendDir, 'dist', 'app.js');

// Verify the app file exists before trying to require it
if (!fs.existsSync(appPath)) {
  console.error(`❌ Error: Application file not found at ${appPath}`);
  console.error(`Current working directory: ${process.cwd()}`);
  console.error(`__dirname: ${__dirname}`);
  console.error(`Looking for file at: ${appPath}`);
  
  // List the contents of the current directory for debugging
  try {
    console.error(`Contents of current directory (${process.cwd()}):`);
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const stats = fs.statSync(filePath);
      console.error(`  ${stats.isDirectory() ? 'd' : '-'} ${file}`);
    });
    
    // Check if dist directory exists
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      console.error(`Contents of dist directory:`);
      const distFiles = fs.readdirSync(distPath);
      distFiles.forEach(file => {
        console.error(`  - ${file}`);
      });
    } else {
      console.error(`❌ dist directory does not exist at ${distPath}`);
    }
  } catch (debugError) {
    console.error(`Error during debugging: ${debugError.message}`);
  }
  
  process.exit(1);
}

console.log(`🚀 Starting Lead Finder Backend from ${appPath}`);

// Set environment variables
// Use project-local browser directory so Render preserves it between build and runtime
const pwBrowsersPath = path.resolve(backendDir, 'pw-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || pwBrowsersPath;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Start the application
try {
  require(appPath);
  console.log('✅ Application started successfully');
} catch (error) {
  console.error(`❌ Failed to start application: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}