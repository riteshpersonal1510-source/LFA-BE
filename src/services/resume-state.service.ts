import { logger } from '../utils/logger';

export interface ScrapeResumeState {
  sessionId: string;
  searchQuery: string;
  keyword: string;
  location: string;
  city: string;
  state: string;
  area: string;
  country: string;
  businessType: string;
  processedCount: number;
  savedCount: number;
  duplicateCount: number;
  processedPlaceIds: string[];
  scrollPosition: number;
  scrollHeight: number;
  lastBusinessName: string;
  lastBusinessHref: string;
  updatedAt: string;
}

const RESUME_DIR = process.cwd() + '/resume-states';

function ensureDir(): void {
  const fs = require('fs');
  if (!fs.existsSync(RESUME_DIR)) fs.mkdirSync(RESUME_DIR, { recursive: true });
}

export class ResumeStateService {
  save(state: ScrapeResumeState): void {
    try {
      ensureDir();
      const fs = require('fs');
      const filePath = `${RESUME_DIR}/${state.sessionId}.json`;
      state.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      logger.error({ err, sessionId: state.sessionId }, 'ResumeState: Failed to save');
    }
  }

  load(sessionId: string): ScrapeResumeState | null {
    try {
      const fs = require('fs');
      const filePath = `${RESUME_DIR}/${sessionId}.json`;
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as ScrapeResumeState;
    } catch (err) {
      logger.error({ err, sessionId }, 'ResumeState: Failed to load');
      return null;
    }
  }

  delete(sessionId: string): void {
    try {
      const fs = require('fs');
      const filePath = `${RESUME_DIR}/${sessionId}.json`;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      logger.error({ err, sessionId }, 'ResumeState: Failed to delete');
    }
  }

  exists(sessionId: string): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync(`${RESUME_DIR}/${sessionId}.json`);
    } catch { return false; }
  }
}

export const resumeStateService = new ResumeStateService();
