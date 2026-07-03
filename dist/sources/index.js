"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceManager = exports.ClutchSource = exports.IndiaMartSource = exports.JustdialSource = exports.GoogleMapsSource = void 0;
var scraper_1 = require("./google-maps/scraper");
Object.defineProperty(exports, "GoogleMapsSource", { enumerable: true, get: function () { return scraper_1.GoogleMapsSource; } });
var scraper_2 = require("./justdial/scraper");
Object.defineProperty(exports, "JustdialSource", { enumerable: true, get: function () { return scraper_2.JustdialSource; } });
var scraper_3 = require("./indiamart/scraper");
Object.defineProperty(exports, "IndiaMartSource", { enumerable: true, get: function () { return scraper_3.IndiaMartSource; } });
var scraper_4 = require("./clutch/scraper");
Object.defineProperty(exports, "ClutchSource", { enumerable: true, get: function () { return scraper_4.ClutchSource; } });
var source_manager_1 = require("../source-manager/source-manager");
Object.defineProperty(exports, "SourceManager", { enumerable: true, get: function () { return source_manager_1.SourceManager; } });
//# sourceMappingURL=index.js.map