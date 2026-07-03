export declare enum SearchState {
    IDLE = "IDLE",
    CREATING_SESSION = "CREATING_SESSION",
    QUEUED = "QUEUED",
    STARTING_BROWSER = "STARTING_BROWSER",
    BROWSER_READY = "BROWSER_READY",
    SEARCHING_GOOGLE_MAPS = "SEARCHING_GOOGLE_MAPS",
    SCRAPING_RESULTS = "SCRAPING_RESULTS",
    PROCESSING_RESULTS = "PROCESSING_RESULTS",
    SAVING_LEADS = "SAVING_LEADS",
    NO_RESULTS = "NO_RESULTS",
    COMPLETED = "COMPLETED",
    STOPPED = "STOPPED",
    FAILED = "FAILED",
    TIMEOUT = "TIMEOUT",
    GOOGLE_BLOCKED = "GOOGLE_BLOCKED"
}
export declare const SEARCH_STATE_TRANSITIONS: Record<SearchState, SearchState[]>;
export declare const TERMINAL_STATES: Set<SearchState>;
export declare const ACTIVE_STATES: Set<SearchState>;
export declare function isValidTransition(from: SearchState, to: SearchState): boolean;
export declare function assertValidTransition(from: SearchState, to: SearchState): void;
export declare function isTerminal(state: SearchState): boolean;
export declare function isActive(state: SearchState): boolean;
export declare function searchStateToLegacyStatus(state: SearchState): 'running' | 'completed' | 'failed' | 'stopped';
export declare function searchStateToFinalStatus(state: SearchState): 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'CANCELLED' | 'TIMEOUT' | 'PARTIAL_SUCCESS' | 'NO_RESULTS';
//# sourceMappingURL=search-state-machine.d.ts.map