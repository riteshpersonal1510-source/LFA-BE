export type NormalizeResult = {
    normalizedPhone: string;
    isValid: boolean;
    reason: string;
};
declare class PhoneNormalizer {
    private INDIAN_MOBILE_PREFIXES;
    private MAX_DIGITS;
    normalize(rawPhone?: string | null): NormalizeResult;
    isValidIndianMobile(phone?: string | null): boolean;
    private _normalizePhoneNumber;
    private _validateNormalizedPhone;
}
export declare const phoneNormalizer: PhoneNormalizer;
export {};
//# sourceMappingURL=phone-normalizer.service.d.ts.map