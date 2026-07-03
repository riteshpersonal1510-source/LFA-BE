"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const location_query_builder_1 = require("../utils/location-query-builder");
const TEST_CASES = [
    { name: 'Ahmedabad, India', keyword: 'Gym', country: 'India', state: 'Gujarat', city: 'Ahmedabad' },
    { name: 'London, UK', keyword: 'Dentist', country: 'United Kingdom', city: 'London' },
    { name: 'Dubai, UAE', keyword: 'Restaurant', country: 'United Arab Emirates', city: 'Dubai' },
    { name: 'Las Vegas, New Mexico, USA', keyword: 'Travel Agency', country: 'United States', state: 'New Mexico', city: 'Las Vegas' },
    { name: 'Tokyo, Japan', keyword: 'Hotel', country: 'Japan', city: 'Tokyo' },
    { name: 'Sydney, Australia', keyword: 'Real Estate', country: 'Australia', state: 'New South Wales', city: 'Sydney' },
];
function run() {
    console.log('=== Global Location Query Verification ===\n');
    let passed = 0;
    for (const tc of TEST_CASES) {
        const parts = { country: tc.country, state: tc.state, city: tc.city, area: tc.area };
        const locationString = (0, location_query_builder_1.buildLocationString)(parts);
        const { searchQuery } = (0, location_query_builder_1.buildMapsSearchQuery)(tc.keyword, parts);
        const hasCountry = searchQuery.includes(tc.country) || locationString.includes(tc.country);
        const hasCity = searchQuery.includes(tc.city);
        const usesCommas = searchQuery.includes(',');
        const hasInKeyword = searchQuery.startsWith(`${tc.keyword} in `);
        const areaFormatOk = !tc.area || searchQuery.includes(`${tc.area}, ${tc.city}`);
        const ok = hasCountry && hasCity && usesCommas && hasInKeyword && areaFormatOk;
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tc.name}`);
        console.log(`  Location: ${locationString}`);
        console.log(`  Query:    ${searchQuery}`);
        console.log(`  URL:      https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`);
        console.log('');
        if (ok)
            passed++;
    }
    const withArea = (0, location_query_builder_1.buildMapsSearchQuery)('Gym', {
        area: 'Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
    });
    const areaOk = withArea.searchQuery === 'Gym in Satellite, Ahmedabad, Gujarat, India';
    console.log(`[${areaOk ? 'PASS' : 'FAIL'}] Area query format`);
    console.log(`  Expected: Gym in Satellite, Ahmedabad, Gujarat, India`);
    console.log(`  Actual:   ${withArea.searchQuery}\n`);
    if (areaOk)
        passed++;
    const withoutArea = (0, location_query_builder_1.buildMapsSearchQuery)('Dentist', {
        city: 'London',
        country: 'United Kingdom',
    });
    const noAreaOk = withoutArea.searchQuery === 'Dentist in London, United Kingdom';
    console.log(`[${noAreaOk ? 'PASS' : 'FAIL'}] City-only query (no state)`);
    console.log(`  Expected: Dentist in London, United Kingdom`);
    console.log(`  Actual:   ${withoutArea.searchQuery}\n`);
    if (noAreaOk)
        passed++;
    const total = TEST_CASES.length + 2;
    console.log(`=== Results: ${passed}/${total} passed ===`);
    if (passed !== total) {
        process.exit(1);
    }
}
run();
//# sourceMappingURL=verify-global-locations.js.map