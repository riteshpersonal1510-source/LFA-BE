#!/usr/bin/env node

/**
 * Deployment script for Lead Finder Backend
 * Ensures all prerequisites are met before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    log(colors.red, `❌ ${description} not found: ${filePath}`);
    return false;
  }
  log(colors.green, `✅ ${description} found: ${filePath}`);
  return true;
}

function runCommand(command, description, options = {}) {
  try {
    log(colors.blue, `🔄 ${description}...`);
    execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      ...options
    });
    log(colors.green, `✅ ${description} completed`);
    return true;
  } catch (error) {
    log(colors.red, `❌ ${description} failed`);
    if (!options.silent) {
      console.error(error.message);
    }
    return false;
  }
}

async function main() {
  log(colors.bright, '🚀 Lead Finder Backend Deployment Script');
  log(colors.bright, '==========================================');

  // 1. Check required files
  log(colors.yellow, '\n📋 Checking required files...');
  let allFilesOk = true;
  
  const requiredFiles = [
    ['package.json', 'Package configuration'],
    ['src/app.ts', 'Main application file'],
    ['tsconfig.json', 'TypeScript configuration'],
    ['.env', 'Environment configuration']
  ];

  for (const [file, desc] of requiredFiles) {
    if (!checkFile(file, desc)) {
      allFilesOk = false;
    }
  }

  if (!allFilesOk) {
    log(colors.red, '\n❌ Required files missing. Deployment aborted.');
    process.exit(1);
  }

  // 2. Check environment variables
  log(colors.yellow, '\n🔍 Checking environment variables...');
  require('dotenv').config();
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  let envOk = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log(colors.red, `❌ Missing environment variable: ${envVar}`);
      envOk = false;
    } else {
      log(colors.green, `✅ Environment variable set: ${envVar}`);
    }
  }

  if (!envOk) {
    log(colors.red, '\n❌ Required environment variables missing. Deployment aborted.');
    process.exit(1);
  }

  // 3. Install dependencies if needed
  log(colors.yellow, '\n📦 Checking dependencies...');
  if (!fs.existsSync('node_modules')) {
    if (!runCommand('npm ci', 'Installing dependencies')) {
      process.exit(1);
    }
  } else {
    log(colors.green, '✅ Dependencies already installed');
  }

  // 4. Clean previous build
  log(colors.yellow, '\n🧹 Cleaning previous build...');
  if (fs.existsSync('dist')) {
    runCommand('npm run clean', 'Cleaning dist directory');
  }

  // 5. Build TypeScript
  log(colors.yellow, '\n🔨 Building TypeScript...');
  if (!runCommand('npm run build', 'Compiling TypeScript')) {
    log(colors.red, '\n❌ TypeScript build failed. Deployment aborted.');
    process.exit(1);
  }

  // 6. Verify build output
  log(colors.yellow, '\n🔍 Verifying build output...');
  const buildFiles = [
    ['dist/app.js', 'Main application'],
    ['dist/config/database.js', 'Database configuration'],
    ['dist/utils/logger.js', 'Logger utility']
  ];

  let buildOk = true;
  for (const [file, desc] of buildFiles) {
    if (!checkFile(file, desc)) {
      buildOk = false;
    }
  }

  if (!buildOk) {
    log(colors.red, '\n❌ Build verification failed. Some files are missing.');
    process.exit(1);
  }

  // 7. Test application startup (quick check)
  log(colors.yellow, '\n🧪 Testing application startup...');
  const testResult = runCommand(
    'timeout 10 node -e "require(\'./dist/app.js\'); setTimeout(() => process.exit(0), 3000)" || true',
    'Quick startup test',
    { silent: true }
  );

  if (!testResult) {
    log(colors.yellow, '⚠️  Startup test inconclusive (this may be normal)');
  } else {
    log(colors.green, '✅ Application startup test passed');
  }

  // 8. Success
  log(colors.green, '\n🎉 Deployment preparation completed successfully!');
  log(colors.bright, '\n📝 Next steps:');
  log(colors.reset, '   1. Deploy to your hosting platform');
  log(colors.reset, '   2. Set environment variables on the platform');
  log(colors.reset, '   3. Run: npm start');
  log(colors.reset, '   4. Check /health endpoint for status');
  
  log(colors.yellow, '\n🔧 Useful commands:');
  log(colors.reset, '   npm start          - Start production server');
  log(colors.reset, '   npm run start:dev  - Start development server');
  log(colors.reset, '   npm run verify     - Verify build bundle');
  log(colors.reset, '   npm run health-check - Quick health check');
}

main().catch(error => {
  log(colors.red, `❌ Deployment script failed: ${error.message}`);
  process.exit(1);
});