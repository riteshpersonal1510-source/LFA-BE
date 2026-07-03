"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
require("dotenv/config");
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    logger_1.logger.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
}
let cachedConnection = null;
const setupConnectionHandlers = () => {
    mongoose_1.default.connection.on('connected', () => {
        logger_1.logger.info({}, 'MongoDB: Connection established');
    });
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.logger.warn({}, 'MongoDB: Connection lost — auto-reconnect enabled');
    });
    mongoose_1.default.connection.on('reconnected', () => {
        logger_1.logger.info({}, 'MongoDB: Reconnected successfully');
    });
    mongoose_1.default.connection.on('error', (err) => {
        logger_1.logger.error({ err: err.message }, 'MongoDB: Connection error');
    });
};
const connectDB = async () => {
    try {
        if (cachedConnection) {
            logger_1.logger.info('Using existing database connection');
            return;
        }
        setupConnectionHandlers();
        const opts = {
            maxPoolSize: 100,
            minPoolSize: 10,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            autoIndex: true,
        };
        const maxAttempts = Number(process.env.MONGODB_MAX_RETRIES || 5);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const connection = await mongoose_1.default.connect(MONGODB_URI, opts);
                cachedConnection = connection;
                logger_1.logger.info({ poolSize: opts.maxPoolSize, minPoolSize: opts.minPoolSize }, 'MongoDB: Connected successfully');
                return;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger_1.logger.warn({ attempt, maxAttempts, error: message }, 'MongoDB: Connection attempt failed');
                if (attempt < maxAttempts) {
                    const delayMs = Math.min(2000 * attempt, 10000);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }
        throw new Error(`MongoDB connection failed after ${maxAttempts} attempts`);
    }
    catch (error) {
        const loggedError = error instanceof Error ? error : new Error(String(error));
        logger_1.logger.error(loggedError, 'MongoDB: Connection failed:');
        throw loggedError;
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        if (cachedConnection) {
            await mongoose_1.default.disconnect();
            cachedConnection = null;
            logger_1.logger.info('Database disconnected');
        }
    }
    catch (error) {
        logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error disconnecting database:');
    }
};
exports.disconnectDB = disconnectDB;
//# sourceMappingURL=database.js.map