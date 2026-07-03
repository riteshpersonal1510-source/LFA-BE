"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const mongoose_1 = __importDefault(require("mongoose"));
const scraper_engine_1 = require("./core/scraper-engine/scraper-engine");
async function main() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('MongoDB connected');
    console.log('\n=== TEST 1: Google Maps Only ===');
    console.log('Searching: restaurant in Surat, Adajan\n');
    try {
        const result = await scraper_engine_1.scraperEngine.scrapeMultiSource({
            keyword: 'restaurant',
            location: 'Adajan, Surat, Gujarat',
            sources: ['google-maps'],
            limit: 10,
            state: 'Gujarat',
            city: 'Surat',
            area: 'Adajan',
            businessType: 'restaurant',
        });
        console.log('Result:');
        console.log(`  Success: ${result.success}`);
        console.log(`  Message: ${result.message}`);
        console.log(`  Total Extracted: ${result.totalExtracted}`);
        console.log(`  Total Stored: ${result.totalStored}`);
        console.log(`  Total Duplicates: ${result.totalDuplicates}`);
        console.log(`  Leads count: ${result.leads.length}`);
        console.log(`  Source Results: ${JSON.stringify(result.sourceResults, null, 2)}`);
        if (result.leads.length > 0) {
            console.log('\n--- Sample Leads ---');
            result.leads.slice(0, 5).forEach((lead, i) => {
                console.log(`\nLead ${i + 1}:`);
                console.log(`  Name: ${lead.companyName}`);
                console.log(`  Phone: ${lead.phone || 'N/A'}`);
                console.log(`  Website: ${lead.website || 'N/A'}`);
                console.log(`  Address: ${lead.address || 'N/A'}`);
                console.log(`  Category: ${lead.category || 'N/A'}`);
                console.log(`  Rating: ${lead.rating || 'N/A'}`);
                console.log(`  Reviews: ${lead.reviewsCount || 'N/A'}`);
            });
        }
        else {
            console.log('No leads found in Google Maps test');
        }
    }
    catch (error) {
        console.error('Test 1 failed:', error);
    }
    console.log('\n=== TEST 2: All Sources ===');
    console.log('Searching: restaurant in Surat, Adajan\n');
    try {
        const result2 = await scraper_engine_1.scraperEngine.scrapeMultiSource({
            keyword: 'restaurant',
            location: 'Adajan, Surat, Gujarat',
            sources: ['google-maps', 'justdial', 'indiamart'],
            limit: 10,
            state: 'Gujarat',
            city: 'Surat',
            area: 'Adajan',
            businessType: 'restaurant',
        });
        console.log('Multi-source Result:');
        console.log(`  Success: ${result2.success}`);
        console.log(`  Message: ${result2.message}`);
        console.log(`  Total Extracted: ${result2.totalExtracted}`);
        console.log(`  Total Stored: ${result2.totalStored}`);
        console.log(`  Total Duplicates: ${result2.totalDuplicates}`);
        console.log(`  Leads count: ${result2.leads.length}`);
        console.log(`  Source Results: ${JSON.stringify(result2.sourceResults, null, 2)}`);
        if (result2.leads.length > 0) {
            console.log('\n--- Sample Leads ---');
            result2.leads.slice(0, 8).forEach((lead, i) => {
                console.log(`\nLead ${i + 1} [${lead.source}]:`);
                console.log(`  Name: ${lead.companyName}`);
                console.log(`  Phone: ${lead.phone || 'N/A'}`);
                console.log(`  Website: ${lead.website || 'N/A'}`);
                console.log(`  Address: ${lead.address || 'N/A'}`);
                console.log(`  Source: ${lead.source}`);
            });
        }
    }
    catch (error) {
        console.error('Test 2 failed:', error);
    }
    console.log('\n=== Browser Status ===');
    const status = scraper_engine_1.scraperEngine.getBrowserStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('\nDone. Cleaning up...');
    await mongoose_1.default.disconnect();
    process.exit(0);
}
main();
//# sourceMappingURL=test-scraper.js.map