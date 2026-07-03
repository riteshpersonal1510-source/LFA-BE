"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlLog = crawlLog;
exports.stabilizeInfiniteScroll = stabilizeInfiniteScroll;
exports.sleep = sleep;
exports.createCrawlResult = createCrawlResult;
exports.logCrawlSummary = logCrawlSummary;
const LOG_PREFIXES = {
    crawler: '[Crawler]',
    parser: '[Parser]',
    validator: '[Validator]',
    verifier: '[Verifier]',
    saver: '[Saver]',
};
function crawlLog(component, message, data) {
    const prefix = LOG_PREFIXES[component];
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`${timestamp} ${prefix} ${message}${logData}`);
}
async function stabilizeInfiniteScroll(scrollFn, options) {
    const maxEmpty = options?.maxEmptyScrolls ?? 3;
    const delay = options?.scrollDelay ?? 1500;
    const retries = options?.retryCount ?? 2;
    const metrics = {
        totalScrolls: 0,
        emptyScrolls: 0,
        maxEmptyScrolls: maxEmpty,
        cardCounts: [],
        stabilized: false,
    };
    let lastCount = 0;
    let emptyStreak = 0;
    let retriesLeft = retries;
    while (emptyStreak < maxEmpty) {
        const currentCount = await scrollFn();
        metrics.totalScrolls++;
        metrics.cardCounts.push(currentCount);
        if (currentCount > lastCount) {
            crawlLog('crawler', `Cards detected: ${currentCount} (${currentCount - lastCount} new)`);
            lastCount = currentCount;
            emptyStreak = 0;
            retriesLeft = retries;
        }
        else {
            emptyStreak++;
            crawlLog('crawler', `No new cards (${emptyStreak}/${maxEmpty})`);
            if (emptyStreak >= maxEmpty && retriesLeft > 0) {
                crawlLog('crawler', `Retrying scroll (${retriesLeft} remaining)`);
                retriesLeft--;
                emptyStreak = 0;
            }
        }
        await sleep(delay);
    }
    metrics.stabilized = true;
    crawlLog('crawler', `Scroll stabilized at ${lastCount} cards after ${metrics.totalScrolls} scrolls`);
    return metrics;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function createCrawlResult(overrides) {
    return {
        googleDisplayedCount: 0,
        actualDetectedCards: 0,
        validParsedLeads: 0,
        savedLeads: 0,
        duplicateSkipped: 0,
        failedLeads: 0,
        scrollMetrics: {
            totalScrolls: 0,
            emptyScrolls: 0,
            maxEmptyScrolls: 3,
            cardCounts: [],
            stabilized: false,
        },
        ...overrides,
    };
}
function logCrawlSummary(result) {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('         CRAWL SUMMARY REPORT');
    console.log('═══════════════════════════════════════');
    console.log(`  Displayed count : ${result.googleDisplayedCount}`);
    console.log(`  Detected cards  : ${result.actualDetectedCards}`);
    console.log(`  Valid leads     : ${result.validParsedLeads}`);
    console.log(`  Saved leads     : ${result.savedLeads}`);
    console.log(`  Duplicates      : ${result.duplicateSkipped}`);
    console.log(`  Failed          : ${result.failedLeads}`);
    console.log(`  Scrolls         : ${result.scrollMetrics.totalScrolls}`);
    console.log(`  Stabilized      : ${result.scrollMetrics.stabilized}`);
    console.log('═══════════════════════════════════════');
    console.log('');
}
//# sourceMappingURL=crawl-engine.js.map