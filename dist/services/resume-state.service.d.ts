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
export declare class ResumeStateService {
    save(state: ScrapeResumeState): void;
    load(sessionId: string): ScrapeResumeState | null;
    delete(sessionId: string): void;
    exists(sessionId: string): boolean;
}
export declare const resumeStateService: ResumeStateService;
//# sourceMappingURL=resume-state.service.d.ts.map