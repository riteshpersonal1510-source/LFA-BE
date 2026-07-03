"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_STATES = exports.TERMINAL_STATES = exports.SEARCH_STATE_TRANSITIONS = exports.SearchState = void 0;
exports.isValidTransition = isValidTransition;
exports.assertValidTransition = assertValidTransition;
exports.isTerminal = isTerminal;
exports.isActive = isActive;
exports.searchStateToLegacyStatus = searchStateToLegacyStatus;
exports.searchStateToFinalStatus = searchStateToFinalStatus;
const logger_1 = require("../utils/logger");
var SearchState;
(function (SearchState) {
    SearchState["IDLE"] = "IDLE";
    SearchState["CREATING_SESSION"] = "CREATING_SESSION";
    SearchState["QUEUED"] = "QUEUED";
    SearchState["STARTING_BROWSER"] = "STARTING_BROWSER";
    SearchState["BROWSER_READY"] = "BROWSER_READY";
    SearchState["SEARCHING_GOOGLE_MAPS"] = "SEARCHING_GOOGLE_MAPS";
    SearchState["SCRAPING_RESULTS"] = "SCRAPING_RESULTS";
    SearchState["PROCESSING_RESULTS"] = "PROCESSING_RESULTS";
    SearchState["SAVING_LEADS"] = "SAVING_LEADS";
    SearchState["NO_RESULTS"] = "NO_RESULTS";
    SearchState["COMPLETED"] = "COMPLETED";
    SearchState["STOPPED"] = "STOPPED";
    SearchState["FAILED"] = "FAILED";
    SearchState["TIMEOUT"] = "TIMEOUT";
    SearchState["GOOGLE_BLOCKED"] = "GOOGLE_BLOCKED";
})(SearchState || (exports.SearchState = SearchState = {}));
exports.SEARCH_STATE_TRANSITIONS = {
    [SearchState.IDLE]: [SearchState.CREATING_SESSION],
    [SearchState.CREATING_SESSION]: [SearchState.QUEUED, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.QUEUED]: [SearchState.STARTING_BROWSER, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.STARTING_BROWSER]: [SearchState.BROWSER_READY, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.BROWSER_READY]: [SearchState.SEARCHING_GOOGLE_MAPS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.SEARCHING_GOOGLE_MAPS]: [SearchState.SCRAPING_RESULTS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.SCRAPING_RESULTS]: [SearchState.PROCESSING_RESULTS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED, SearchState.NO_RESULTS],
    [SearchState.PROCESSING_RESULTS]: [SearchState.SAVING_LEADS, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.SAVING_LEADS]: [SearchState.COMPLETED, SearchState.STOPPED, SearchState.FAILED, SearchState.TIMEOUT, SearchState.GOOGLE_BLOCKED],
    [SearchState.NO_RESULTS]: [],
    [SearchState.COMPLETED]: [],
    [SearchState.STOPPED]: [SearchState.QUEUED],
    [SearchState.FAILED]: [],
    [SearchState.TIMEOUT]: [],
    [SearchState.GOOGLE_BLOCKED]: [],
};
exports.TERMINAL_STATES = new Set([
    SearchState.COMPLETED,
    SearchState.NO_RESULTS,
    SearchState.STOPPED,
    SearchState.FAILED,
    SearchState.TIMEOUT,
    SearchState.GOOGLE_BLOCKED,
]);
exports.ACTIVE_STATES = new Set([
    SearchState.CREATING_SESSION,
    SearchState.QUEUED,
    SearchState.STARTING_BROWSER,
    SearchState.BROWSER_READY,
    SearchState.SEARCHING_GOOGLE_MAPS,
    SearchState.SCRAPING_RESULTS,
    SearchState.PROCESSING_RESULTS,
    SearchState.SAVING_LEADS,
]);
function isValidTransition(from, to) {
    return exports.SEARCH_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
function assertValidTransition(from, to) {
    if (!isValidTransition(from, to)) {
        const msg = `Invalid search state transition: ${from} -> ${to}. ` +
            `Allowed transitions from ${from}: [${exports.SEARCH_STATE_TRANSITIONS[from]?.join(', ') || 'none'}]`;
        logger_1.logger.error({ from, to, allowed: exports.SEARCH_STATE_TRANSITIONS[from] }, msg);
        throw new Error(msg);
    }
}
function isTerminal(state) {
    return exports.TERMINAL_STATES.has(state);
}
function isActive(state) {
    return exports.ACTIVE_STATES.has(state);
}
function searchStateToLegacyStatus(state) {
    if (state === SearchState.COMPLETED || state === SearchState.NO_RESULTS)
        return 'completed';
    if (state === SearchState.FAILED || state === SearchState.TIMEOUT || state === SearchState.GOOGLE_BLOCKED)
        return 'failed';
    if (state === SearchState.STOPPED)
        return 'stopped';
    return 'running';
}
function searchStateToFinalStatus(state) {
    if (state === SearchState.QUEUED)
        return 'QUEUED';
    if (state === SearchState.COMPLETED)
        return 'COMPLETED';
    if (state === SearchState.NO_RESULTS)
        return 'NO_RESULTS';
    if (state === SearchState.TIMEOUT)
        return 'TIMEOUT';
    if (state === SearchState.GOOGLE_BLOCKED)
        return 'FAILED';
    if (state === SearchState.FAILED)
        return 'FAILED';
    if (state === SearchState.STOPPED)
        return 'STOPPED';
    return 'RUNNING';
}
//# sourceMappingURL=search-state-machine.js.map