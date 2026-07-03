# Lead Finder Backend

A comprehensive MERN stack backend for lead generation and management with AI-powered analysis capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account or local MongoDB instance
- Environment variables configured

### Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm ci

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Build the application
npm run build

# Start the server
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Required Variables
NODE_ENV=production
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Optional but Recommended
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=bcrypt_hashed_password
CLIENT_URL=https://your-frontend-url.com
AI_SERVICE_URL=https://your-ai-service.com
PYTHON_SCRAPER_URL=https://your-python-scraper.com
```

### Database Setup

1. Create a MongoDB Atlas cluster or set up local MongoDB
2. Get the connection string and update `MONGODB_URI`
3. The application will automatically create necessary indexes and collections

## 📜 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run typecheck` - Check TypeScript types without building
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Building & Production
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run start:dev` - Start development server from built files
- `npm run clean` - Remove build artifacts

### Deployment & Health
- `node deploy.js` - Run pre-deployment checks
- `node health-check.js` - Verify application health
- `npm run verify` - Quick bundle verification

### Database & Seeding
- `npm run seed` - Seed initial data
- `npm run seed:locations` - Seed location data

## 🏗 Project Structure

```
backend/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── app.ts            # Main application file
├── dist/                 # Compiled JavaScript (generated)
├── logs/                 # Application logs
├── uploads/              # File uploads
├── .env                  # Environment variables
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript configuration
├── Procfile              # Deployment configuration
├── deploy.js             # Deployment script
├── health-check.js       # Health check script
└── start.js              # Production startup script
```

## 🚀 Deployment

### Heroku Deployment

1. **Prepare for deployment:**
   ```bash
   node deploy.js
   ```

2. **Deploy to Heroku:**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create app
   heroku create your-app-name
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI="your-connection-string"
   heroku config:set JWT_SECRET="your-jwt-secret"
   
   # Deploy
   git push heroku main
   ```

### Render Deployment

1. Connect your GitHub repository to Render
2. Set the build command: `npm run build`
3. Set the start command: `npm start`
4. Add environment variables in Render dashboard
5. Deploy

### Docker Deployment

```bash
# Build image
docker build -t lead-finder-backend .

# Run container
docker run -p 8000:8000 --env-file .env lead-finder-backend
```

### Manual Deployment

1. **Build the application:**
   ```bash
   npm ci --only=production
   npm run build
   ```

2. **Start the server:**
   ```bash
   node start.js
   ```

## 🏥 Health Monitoring

### Health Check Endpoints

- `GET /health` - Basic health status
- `GET /api/health` - Detailed API health status
- `GET /api/debug/network` - Network and environment debug info

### Manual Health Check

```bash
# Check if the backend is healthy
node health-check.js

# Check specific URL
BASE_URL=https://your-app.com node health-check.js
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures:**
   ```bash
   # Clear cache and rebuild
   npm run clean
   npm ci
   npm run build
   ```

2. **Database Connection Issues:**
   - Verify `MONGODB_URI` is correct
   - Check network connectivity
   - Ensure MongoDB Atlas IP whitelist includes your server

3. **Environment Variable Issues:**
   ```bash
   # Check if variables are loaded
   node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"
   ```

4. **Port Issues:**
   ```bash
   # Check if port is in use
   netstat -tulpn | grep :8000
   
   # Kill process using port
   fuser -k 8000/tcp
   ```

### Logs

Application logs are available in:
- Console output (development)
- `logs/` directory (production)
- Platform-specific logs (Heroku, Render, etc.)

## 🔒 Security

- JWT-based authentication
- Helmet.js security headers
- CORS configuration
- Input validation with express-validator
- MongoDB injection prevention
- Rate limiting on sensitive endpoints

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/services/auth.test.ts
```

## 📊 Performance

- Connection pooling for MongoDB
- Request compression with gzip
- Caching strategies for frequently accessed data
- Graceful shutdown handling
- Memory leak monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and type checks
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review application logs
- Open an issue on GitHub
- Contact: ritesh.work.1510@gmail.com