#!/usr/bin/env node

/**
 * Health check script for Lead Finder Backend
 * Verifies that the application is working correctly
 */

const http = require('http');
const https = require('https');

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

function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          data: data,
          headers: response.headers
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkEndpoint(url, expectedStatus = 200, description = '') {
  try {
    log(colors.blue, `🔍 Checking ${description || url}...`);
    
    const response = await makeRequest(url);
    
    if (response.statusCode === expectedStatus) {
      log(colors.green, `✅ ${description || url} - Status: ${response.statusCode}`);
      
      try {
        const jsonData = JSON.parse(response.data);
        if (jsonData.success !== undefined) {
          log(colors.green, `   Response: ${jsonData.success ? 'Success' : 'Failed'}`);
        }
        if (jsonData.message) {
          log(colors.blue, `   Message: ${jsonData.message}`);
        }
        return { success: true, data: jsonData };
      } catch {
        return { success: true, data: response.data };
      }
    } else {
      log(colors.red, `❌ ${description || url} - Unexpected status: ${response.statusCode}`);
      return { success: false, status: response.statusCode };
    }
  } catch (error) {
    log(colors.red, `❌ ${description || url} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  log(colors.bright, '🏥 Lead Finder Backend Health Check');
  log(colors.bright, '===================================');
  
  // Get the port from environment or use default
  require('dotenv').config();
  const PORT = process.env.PORT || 8000;
  const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
  
  log(colors.yellow, `\n📋 Checking backend at: ${BASE_URL}`);
  
  const checks = [
    {
      url: `${BASE_URL}/`,
      description: 'Root endpoint',
      expectedStatus: 200
    },
    {
      url: `${BASE_URL}/health`,
      description: 'Health endpoint',
      expectedStatus: 200
    },
    {
      url: `${BASE_URL}/api/health`,
      description: 'API health endpoint',
      expectedStatus: 200
    },
    {
      url: `${BASE_URL}/api/v1/routes`,
      description: 'Routes listing',
      expectedStatus: 200
    }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const check of checks) {
    const result = await checkEndpoint(check.url, check.expectedStatus, check.description);
    results.push(result);
    if (!result.success) {
      allPassed = false;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log(colors.yellow, '\n📊 Health Check Summary:');
  log(colors.bright, '========================');
  
  results.forEach((result, index) => {
    const check = checks[index];
    const status = result.success ? colors.green + '✅ PASS' : colors.red + '❌ FAIL';
    log(colors.reset, `${status}${colors.reset} - ${check.description}`);
  });
  
  if (allPassed) {
    log(colors.green, '\n🎉 All health checks passed!');
    log(colors.bright, '   Backend is ready for deployment.');
    process.exit(0);
  } else {
    log(colors.red, '\n❌ Some health checks failed.');
    log(colors.yellow, '   Please check the backend logs for more details.');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node health-check.js [options]

Options:
  --help, -h     Show this help message
  
Environment variables:
  PORT           Port number (default: 8000)
  BASE_URL       Base URL to check (default: http://localhost:PORT)
  
Examples:
  node health-check.js
  PORT=3000 node health-check.js
  BASE_URL=https://your-app.herokuapp.com node health-check.js
`);
  process.exit(0);
}

main().catch(error => {
  log(colors.red, `❌ Health check script failed: ${error.message}`);
  process.exit(1);
});