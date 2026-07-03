"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeStateService = exports.ResumeStateService = void 0;
const logger_1 = require("../utils/logger");
const RESUME_DIR = process.cwd() + '/resume-states';
function ensureDir() {
    const fs = require('fs');
    if (!fs.existsSync(RESUME_DIR))
        fs.mkdirSync(RESUME_DIR, { recursive: true });
}
class ResumeStateService {
    save(state) {
        try {
            ensureDir();
            const fs = require('fs');
            const filePath = `${RESUME_DIR}/${state.sessionId}.json`;
            state.updatedAt = new Date().toISOString();
            fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
        }
        catch (err) {
            logger_1.logger.error({ err, sessionId: state.sessionId }, 'ResumeState: Failed to save');
        }
    }
    load(sessionId) {
        try {
            const fs = require('fs');
            const filePath = `${RESUME_DIR}/${sessionId}.json`;
            if (!fs.existsSync(filePath))
                return null;
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
        catch (err) {
            logger_1.logger.error({ err, sessionId }, 'ResumeState: Failed to load');
            return null;
        }
    }
    delete(sessionId) {
        try {
            const fs = require('fs');
            const filePath = `${RESUME_DIR}/${sessionId}.json`;
            if (fs.existsSync(filePath))
                fs.unlinkSync(filePath);
        }
        catch (err) {
            logger_1.logger.error({ err, sessionId }, 'ResumeState: Failed to delete');
        }
    }
    exists(sessionId) {
        try {
            const fs = require('fs');
            return fs.existsSync(`${RESUME_DIR}/${sessionId}.json`);
        }
        catch {
            return false;
        }
    }
}
exports.ResumeStateService = ResumeStateService;
exports.resumeStateService = new ResumeStateService();
//# sourceMappingURL=resume-state.service.js.map