"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaIterator = exports.AreaIterator = void 0;
const location_data_1 = require("../config/location-data");
class AreaIterator {
    iterate(state, cities) {
        const results = [];
        for (const city of cities) {
            const areas = this.getAreas(state, city);
            for (const area of areas) {
                results.push({ city, area });
            }
        }
        return results;
    }
    getCities(state) {
        return (0, location_data_1.getCitiesForState)(state);
    }
    getAreas(state, city) {
        return (0, location_data_1.getAreasForCity)(state, city);
    }
    countJobs(state, cities, businessTypes) {
        let areaCount = 0;
        for (const city of cities) {
            areaCount += this.getAreas(state, city).length;
        }
        return areaCount * businessTypes.length;
    }
}
exports.AreaIterator = AreaIterator;
exports.areaIterator = new AreaIterator();
//# sourceMappingURL=area-iterator.js.map