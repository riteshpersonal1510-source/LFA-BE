# 🚀 Lead Finder Backend Deployment Guide

This guide provides step-by-step instructions for deploying the Lead Finder Backend to various platforms.

## 📋 Pre-Deployment Checklist

### 1. System Requirements
- Node.js 18 or higher
- npm or yarn package manager
- Git (for version control)
- Access to MongoDB Atlas or MongoDB instance

### 2. Windows PowerShell Issues

If you encounter PowerShell execution policy errors on Windows:

```powershell
# Option 1: Set execution policy for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Option 2: Use alternative commands
cmd /c "npm run build"
cmd /c "node deploy.js"
```

### 3. Environment Setup

1. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific values
   ```

2. **Required Variables:**
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string (64+ characters)
   - `NODE_ENV`: Set to "production"
   - `PORT`: Port number (default: 8000)

3. **Optional but Recommended:**
   - `ADMIN_EMAIL`: Admin user email
   - `ADMIN_PASSWORD_HASH`: Bcrypt hash of admin password
   - `CLIENT_URL`: Frontend application URL

## 🏗️ Build Process

### Windows Users (PowerShell Issues)

```bash
# Method 1: Use cmd wrapper
cmd /c "npm ci"
cmd /c "npm run build"

# Method 2: Use Node.js directly
node_modules\.bin\tsc --build

# Method 3: Use deployment script
node deploy.js
```

### Standard Build Process

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Verify build
npm run verify
```

## 🌐 Platform-Specific Deployments

### 1. Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Heroku account

#### Steps:
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"
heroku config:set JWT_SECRET="your-secure-jwt-secret"
heroku config:set CLIENT_URL="https://your-frontend.netlify.app"

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Check logs
heroku logs --tail
```

#### Heroku-Specific Files:
- `Procfile`: Already configured (`web: npm run start`)
- Build process: Heroku runs `npm run build` automatically

### 2. Render Deployment

#### Prerequisites
- Render account
- GitHub repository

#### Steps:
1. **Connect Repository:**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service:**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node.js
   - **Plan:** Free or Starter

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   CLIENT_URL=https://your-frontend.com
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Monitor deployment logs

### 3. Railway Deployment

#### Prerequisites
- Railway account
- GitHub repository

#### Steps:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-secret"

# Deploy
railway up
```

### 4. AWS EC2 Deployment

#### Prerequisites
- AWS account
- EC2 instance with Node.js

#### Steps:
```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Clone repository
git clone https://github.com/your-username/your-repo.git
cd your-repo/backend

# Install dependencies
npm ci

# Set up environment
cp .env.example .env
nano .env  # Edit with your values

# Build application
npm run build

# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start dist/app.js --name lead-finder-backend

# Set up PM2 to restart on reboot
pm2 startup
pm2 save
```

### 5. Docker Deployment

#### Prerequisites
- Docker installed

#### Steps:
```bash
# Build Docker image
docker build -t lead-finder-backend .

# Run container
docker run -d \
  --name lead-finder-backend \
  -p 8000:8000 \
  --env-file .env \
  lead-finder-backend

# Check logs
docker logs -f lead-finder-backend

# Health check
docker exec lead-finder-backend node health-check.js
```

#### Docker Compose (Optional):
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🔍 Post-Deployment Verification

### 1. Health Checks

```bash
# Local health check
node health-check.js

# Remote health check
curl https://your-app.herokuapp.com/health

# Detailed API health
curl https://your-app.herokuapp.com/api/health
```

### 2. Common Endpoints to Test

- `GET /` - Welcome message
- `GET /health` - Health status
- `GET /api/health` - API health details
- `GET /api/v1/routes` - Available routes list

### 3. Expected Responses

#### Health Endpoint:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "uptime": 123.45,
  "environment": "production"
}
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Build Failures
```bash
# Clear everything and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Database Connection Issues
- Check `MONGODB_URI` format
- Verify network access (IP whitelist in Atlas)
- Test connection string separately

#### 3. Environment Variable Issues
```bash
# Check if variables are loaded
node -e "require('dotenv').config(); console.log('NODE_ENV:', process.env.NODE_ENV)"
```

#### 4. Port Binding Issues
- Check if port is already in use
- Verify firewall settings
- Use different port if needed

#### 5. PowerShell Execution Policy (Windows)
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Alternative: Use cmd
cmd /c "npm start"
```

### Debugging Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify TypeScript compilation
npx tsc --noEmit

# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('DB OK')).catch(console.error)"
```

## 📊 Monitoring & Maintenance

### 1. Log Monitoring
- Check application logs regularly
- Monitor error rates and patterns
- Set up log aggregation (optional)

### 2. Performance Monitoring
- Monitor response times
- Check memory usage
- Watch database connection pool

### 3. Security Updates
- Update dependencies regularly: `npm audit fix`
- Monitor security advisories
- Review access logs

## 🆘 Emergency Procedures

### 1. Quick Rollback
```bash
# Heroku
heroku rollback v123

# Railway
railway rollback

# Manual deployment
git reset --hard previous-commit-hash
git push --force-with-lease
```

### 2. Emergency Fixes
```bash
# Hot fix for environment variables
heroku config:set VARIABLE_NAME=new_value

# Restart application
heroku restart
```

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the main `README.md` for additional troubleshooting
2. Review application logs for specific error messages
3. Verify all environment variables are correctly set
4. Test locally before deploying to production

For additional support: ritesh.work.1510@gmail.com