export interface LocationValidationResult {
    relevant: boolean;
    locationConfidence: number;
    areaMatch: boolean;
    cityMatch: boolean;
    stateMatch: boolean;
    matchedAreas: string[];
    matchType: 'exact' | 'partial' | 'none';
    distance: 'same' | 'nearby' | 'different';
}
export declare class LocationValidator {
    validate(address: string | undefined, targetArea?: string, targetCity?: string, targetState?: string): LocationValidationResult;
    private exactMatch;
    private partialMatch;
    private wordMatch;
    private generateCityVariants;
    private extractPincode;
    private inferCityFromPincode;
    private getStateAbbreviation;
}
export declare const locationValidator: LocationValidator;
//# sourceMappingURL=location-validator.d.ts.map