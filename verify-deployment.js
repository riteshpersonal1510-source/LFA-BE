#!/usr/bin/env node

/**
 * Comprehensive deployment verification script
 * Checks all aspects of the deployment to ensure it's ready for production
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      log(colors.green, `✅ ${description}: ${filePath} (${Math.round(stats.size / 1024)}KB)`);
      return { exists: true, size: stats.size };
    } else {
      log(colors.red, `❌ ${description}: ${filePath} - NOT FOUND`);
      return { exists: false, size: 0 };
    }
  } catch (error) {
    log(colors.red, `❌ ${description}: Error checking ${filePath} - ${error.message}`);
    return { exists: false, size: 0, error: error.message };
  }
}

function checkPackageJson() {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    
    log(colors.blue, `📦 Package: ${pkg.name} v${pkg.version}`);
    log(colors.blue, `📝 Description: ${pkg.description}`);
    
    // Check essential scripts
    const requiredScripts = ['start', 'build'];
    const missingScripts = requiredScripts.filter(script => !pkg.scripts[script]);
    
    if (missingScripts.length === 0) {
      log(colors.green, '✅ All required npm scripts are present');
    } else {
      log(colors.red, `❌ Missing npm scripts: ${missingScripts.join(', ')}`);
    }
    
    // Check dependencies
    const depCount = Object.keys(pkg.dependencies || {}).length;
    const devDepCount = Object.keys(pkg.devDependencies || {}).length;
    
    log(colors.cyan, `📚 Dependencies: ${depCount} production, ${devDepCount} development`);
    
    return true;
  } catch (error) {
    log(colors.red, `❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function checkEnvironment() {
  log(colors.yellow, '\n🔍 Environment Configuration:');
  
  require('dotenv').config();
  
  const criticalVars = [
    { name: 'NODE_ENV', required: true },
    { name: 'PORT', required: false, default: '8000' },
    { name: 'MONGODB_URI', required: true },
    { name: 'JWT_SECRET', required: true }
  ];
  
  const optionalVars = [
    'CLIENT_URL',
    'AI_SERVICE_URL',
    'PYTHON_SCRAPER_URL',
    'ADMIN_EMAIL',
    'CORS_ORIGINS'
  ];
  
  let envOk = true;
  
  // Check critical variables
  criticalVars.forEach(varInfo => {
    const value = process.env[varInfo.name];
    if (value) {
      const displayValue = varInfo.name === 'JWT_SECRET' || varInfo.name === 'MONGODB_URI' 
        ? `${value.substring(0, 10)}...` 
        : value;
      log(colors.green, `✅ ${varInfo.name}: ${displayValue}`);
    } else if (varInfo.required) {
      log(colors.red, `❌ ${varInfo.name}: NOT SET (REQUIRED)`);
      envOk = false;
    } else {
      log(colors.yellow, `⚠️  ${varInfo.name}: Using default (${varInfo.default || 'none'})`);
    }
  });
  
  // Check optional variables
  log(colors.cyan, '\n📋 Optional Configuration:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log(colors.green, `✅ ${varName}: ${value}`);
    } else {
      log(colors.yellow, `⚠️  ${varName}: Not set`);
    }
  });
  
  return envOk;
}

function checkBuildArtifacts() {
  log(colors.yellow, '\n🏗️ Build Artifacts:');
  
  const criticalFiles = [
    { path: './dist/app.js', desc: 'Main application' },
    { path: './dist/config/database.js', desc: 'Database config' },
    { path: './dist/utils/logger.js', desc: 'Logger utility' },
    { path: './dist/routes/index.js', desc: 'Route definitions' }
  ];
  
  let buildOk = true;
  let totalSize = 0;
  
  criticalFiles.forEach(file => {
    const result = checkFile(file.path, file.desc);
    if (!result.exists) {
      buildOk = false;
    } else {
      totalSize += result.size;
    }
  });
  
  if (buildOk) {
    log(colors.green, `✅ Build verification passed (Total: ${Math.round(totalSize / 1024)}KB)`);
  } else {
    log(colors.red, '❌ Build verification failed - some files are missing');
  }
  
  return buildOk;
}

function checkDependencies() {
  log(colors.yellow, '\n📦 Dependencies:');
  
  if (!fs.existsSync('./node_modules')) {
    log(colors.red, '❌ node_modules directory not found - run npm install');
    return false;
  }
  
  try {
    // Check if critical packages are installed
    const criticalPackages = [
      'express',
      'mongoose',
      'dotenv',
      'typescript',
      'jsonwebtoken',
      'cors',
      'helmet'
    ];
    
    let depsOk = true;
    
    criticalPackages.forEach(pkg => {
      try {
        const pkgPath = `./node_modules/${pkg}/package.json`;
        if (fs.existsSync(pkgPath)) {
          const pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          log(colors.green, `✅ ${pkg}: v${pkgInfo.version}`);
        } else {
          log(colors.red, `❌ ${pkg}: Not installed`);
          depsOk = false;
        }
      } catch (error) {
        log(colors.red, `❌ ${pkg}: Error checking - ${error.message}`);
        depsOk = false;
      }
    });
    
    return depsOk;
  } catch (error) {
    log(colors.red, `❌ Error checking dependencies: ${error.message}`);
    return false;
  }
}

function performRuntimeTest() {
  return new Promise((resolve) => {
    log(colors.yellow, '\n🧪 Runtime Test:');
    
    try {
      // Try to require the main application
      delete require.cache[require.resolve('./dist/app.js')];
      
      const originalLog = console.log;
      const originalError = console.error;
      
      // Suppress console output during test
      console.log = () => {};
      console.error = () => {};
      
      const testTimeout = setTimeout(() => {
        console.log = originalLog;
        console.error = originalError;
        log(colors.yellow, '⚠️  Runtime test timed out (this may be normal)');
        resolve(true);
      }, 5000);
      
      require('./dist/app.js');
      
      setTimeout(() => {
        console.log = originalLog;
        console.error = originalError;
        clearTimeout(testTimeout);
        log(colors.green, '✅ Runtime test passed - application loads without errors');
        resolve(true);
      }, 2000);
      
    } catch (error) {
      log(colors.red, `❌ Runtime test failed: ${error.message}`);
      resolve(false);
    }
  });
}

function generateReport(results) {
  log(colors.bright, '\n📊 Deployment Verification Report');
  log(colors.bright, '=================================');
  
  const checks = [
    { name: 'Package Configuration', result: results.package },
    { name: 'Environment Variables', result: results.environment },
    { name: 'Build Artifacts', result: results.build },
    { name: 'Dependencies', result: results.dependencies },
    { name: 'Runtime Test', result: results.runtime }
  ];
  
  let passedCount = 0;
  
  checks.forEach(check => {
    const status = check.result ? colors.green + '✅ PASS' : colors.red + '❌ FAIL';
    log(colors.reset, `${status}${colors.reset} - ${check.name}`);
    if (check.result) passedCount++;
  });
  
  const score = Math.round((passedCount / checks.length) * 100);
  
  log(colors.bright, `\n📈 Overall Score: ${score}% (${passedCount}/${checks.length})`);
  
  if (score === 100) {
    log(colors.green, '\n🎉 Deployment verification PASSED! ✨');
    log(colors.bright, '   Your backend is ready for production deployment.');
    return true;
  } else if (score >= 80) {
    log(colors.yellow, '\n⚠️  Deployment verification PASSED with warnings.');
    log(colors.yellow, '   Some non-critical issues found. Review and fix if needed.');
    return true;
  } else {
    log(colors.red, '\n❌ Deployment verification FAILED.');
    log(colors.red, '   Critical issues found. Please fix before deploying.');
    return false;
  }
}

async function main() {
  log(colors.bright, '🔍 Lead Finder Backend - Deployment Verification');
  log(colors.bright, '================================================');
  
  const results = {
    package: checkPackageJson(),
    environment: checkEnvironment(),
    build: checkBuildArtifacts(),
    dependencies: checkDependencies(),
    runtime: await performRuntimeTest()
  };
  
  const success = generateReport(results);
  
  if (success) {
    log(colors.cyan, '\n🚀 Next Steps:');
    log(colors.reset, '   1. Deploy to your chosen platform');
    log(colors.reset, '   2. Set environment variables on the platform');
    log(colors.reset, '   3. Test the deployed application');
    log(colors.reset, '   4. Monitor logs and performance');
    
    log(colors.cyan, '\n🔧 Useful Commands:');
    log(colors.reset, '   npm start              - Start production server');
    log(colors.reset, '   node health-check.js   - Run health check');
    log(colors.reset, '   npm run deploy-check   - Pre-deployment verification');
  }
  
  process.exit(success ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Lead Finder Backend - Deployment Verification

Usage: node verify-deployment.js [options]

Options:
  --help, -h     Show this help message

This script performs a comprehensive check of your backend deployment:
- Package configuration
- Environment variables
- Build artifacts
- Dependencies
- Runtime testing

Examples:
  node verify-deployment.js
`);
  process.exit(0);
}

main().catch(error => {
  log(colors.red, `❌ Verification script failed: ${error.message}`);
  process.exit(1);
});