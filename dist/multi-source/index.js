"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundEnrichmentWorker = exports.mergeEngine = exports.BackgroundEnrichmentWorker = exports.MergeEngine = exports.isIndiaCountry = exports.ALL_SOURCES = exports.INTERNATIONAL_SOURCES = exports.INDIA_SOURCES = exports.validateSources = exports.getSourcesForCountry = void 0;
var source_router_1 = require("./source-router");
Object.defineProperty(exports, "getSourcesForCountry", { enumerable: true, get: function () { return source_router_1.getSourcesForCountry; } });
Object.defineProperty(exports, "validateSources", { enumerable: true, get: function () { return source_router_1.validateSources; } });
Object.defineProperty(exports, "INDIA_SOURCES", { enumerable: true, get: function () { return source_router_1.INDIA_SOURCES; } });
Object.defineProperty(exports, "INTERNATIONAL_SOURCES", { enumerable: true, get: function () { return source_router_1.INTERNATIONAL_SOURCES; } });
Object.defineProperty(exports, "ALL_SOURCES", { enumerable: true, get: function () { return source_router_1.ALL_SOURCES; } });
Object.defineProperty(exports, "isIndiaCountry", { enumerable: true, get: function () { return source_router_1.isIndiaCountry; } });
var merge_engine_1 = require("./merge-engine");
Object.defineProperty(exports, "MergeEngine", { enumerable: true, get: function () { return merge_engine_1.MergeEngine; } });
var background_enrichment_1 = require("./background-enrichment");
Object.defineProperty(exports, "BackgroundEnrichmentWorker", { enumerable: true, get: function () { return background_enrichment_1.BackgroundEnrichmentWorker; } });
const merge_engine_2 = require("./merge-engine");
const background_enrichment_2 = require("./background-enrichment");
exports.mergeEngine = new merge_engine_2.MergeEngine();
exports.backgroundEnrichmentWorker = new background_enrichment_2.BackgroundEnrichmentWorker();
//# sourceMappingURL=index.js.map