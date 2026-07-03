import { LeadData } from '../../source-core/base-source';
export declare class JustdialParser {
    parse(_html: string, _sourceUrl: string): LeadData[];
    parseBusiness(_card: any): LeadData | null;
    extractPhones(text: string): string[];
    extractEmails(text: string): string[];
    extractWebsites(text: string): string[];
}
//# sourceMappingURL=parser.d.ts.map