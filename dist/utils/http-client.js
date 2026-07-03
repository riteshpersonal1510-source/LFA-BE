"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpClient = getHttpClient;
exports.resetHttpClient = resetHttpClient;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
let sharedClient = null;
function getHttpClient(config) {
    if (sharedClient && !config)
        return sharedClient;
    const client = axios_1.default.create({
        timeout: 5000,
        maxRedirects: 3,
        ...config,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            ...config?.headers,
        },
        httpsAgent: new https_1.default.Agent({
            keepAlive: true,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 30000,
            keepAliveMsecs: 3000,
        }),
        validateStatus: (status) => status < 500,
    });
    if (!config) {
        sharedClient = client;
    }
    return client;
}
function resetHttpClient() {
    sharedClient = null;
}
//# sourceMappingURL=http-client.js.map