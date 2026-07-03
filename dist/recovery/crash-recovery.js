"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashRecovery = void 0;
const logger_1 = require("../utils/logger");
class CrashRecovery {
    constructor(browserPool, options = {}) {
        this.restartCount = new Map();
        this.browserPool = browserPool;
        this.options = {
            maxRestartAttempts: 3,
            restartCooldown: 5000,
            ...options,
        };
    }
    async handleCrash(sessionId) {
        logger_1.logger.warn(`CrashRecovery: Handling crash for session ${sessionId}`);
        const currentAttempts = this.restartCount.get(sessionId) || 0;
        if (currentAttempts >= this.options.maxRestartAttempts) {
            logger_1.logger.error(`CrashRecovery: Max restart attempts reached for session ${sessionId}`);
            return false;
        }
        if (currentAttempts > 0) {
            logger_1.logger.info(`CrashRecovery: Waiting ${this.options.restartCooldown}ms before restart`);
            await this.sleep(this.options.restartCooldown);
        }
        try {
            await this.browserPool.restart(sessionId);
            this.restartCount.set(sessionId, currentAttempts + 1);
            logger_1.logger.info(`CrashRecovery: Successfully restarted session ${sessionId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`CrashRecovery: Failed to restart session ${sessionId}:`, error);
            return false;
        }
    }
    reset(sessionId) {
        this.restartCount.delete(sessionId);
        logger_1.logger.info(`CrashRecovery: Reset restart count for session ${sessionId}`);
    }
    getRestartCount(sessionId) {
        return this.restartCount.get(sessionId) || 0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.CrashRecovery = CrashRecovery;
//# sourceMappingURL=crash-recovery.js.map