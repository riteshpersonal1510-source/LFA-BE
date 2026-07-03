export interface AreaIteration {
    city: string;
    area: string;
}
export declare class AreaIterator {
    iterate(state: string, cities: string[]): AreaIteration[];
    getCities(state: string): string[];
    getAreas(state: string, city: string): string[];
    countJobs(state: string, cities: string[], businessTypes: string[]): number;
}
export declare const areaIterator: AreaIterator;
//# sourceMappingURL=area-iterator.d.ts.map