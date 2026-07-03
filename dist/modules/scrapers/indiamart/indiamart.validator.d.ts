import type { IndiaMartEnrichedLead, ValidationResult } from './indiamart.types';
export declare function validatePhone(phone: string): ValidationResult;
export declare function validateWebsiteUrl(url: string): ValidationResult;
export declare function validateCompanyName(name: string): ValidationResult;
export declare function validateAddress(address: string): ValidationResult;
export declare function findDuplicate(lead: IndiaMartEnrichedLead): Promise<ValidationResult>;
export declare function validateLead(lead: IndiaMartEnrichedLead): Promise<ValidationResult>;
//# sourceMappingURL=indiamart.validator.d.ts.map