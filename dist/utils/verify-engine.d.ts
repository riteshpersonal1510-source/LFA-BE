export type PhoneValidationResult = 'valid' | 'invalid' | 'risky';
export type EmailValidationResult = 'valid' | 'invalid' | 'risky' | 'unknown';
export interface PhoneInfo {
    normalized: string;
    isValid: boolean;
    validationResult: PhoneValidationResult;
    isIndian: boolean;
    provider?: string;
}
export interface EmailInfo {
    email: string;
    validationResult: EmailValidationResult;
    isDisposable: boolean;
    domain: string;
    hasMxRecord: boolean | null;
}
export interface AddressInfo {
    normalized: string;
    isValid: boolean;
    state?: string;
    city?: string;
    area?: string;
    issues: string[];
}
export declare function normalizePhone(phone: string): string;
export declare function validatePhone(phone: string): PhoneInfo;
export declare function validateEmail(email: string): EmailInfo;
export declare function validateAddressConsistency(address: string, state?: string, city?: string): AddressInfo;
export declare function normalizeCategory(category: string): string;
export declare function getVerificationScore(lead: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    category?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    websiteClassification?: string | null;
    socialPlatforms?: string[] | null;
}): number;
//# sourceMappingURL=verify-engine.d.ts.map