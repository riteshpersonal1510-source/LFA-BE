export interface OwnerInfo {
    name: string;
    role: string;
    confidence: number;
    source: string;
}
export interface OwnerDetectionResult {
    ownerNames: string[];
    founders: OwnerInfo[];
    ceo?: OwnerInfo;
    management: OwnerInfo[];
    extractionTime: number;
}
export declare class OwnerDetectorService {
    private browserManager;
    detectOwner(website: string): Promise<OwnerDetectionResult>;
    private findAboutPage;
    private parseOwnerNames;
    extractFromAboutPage(content: string, _url: string): Promise<OwnerInfo[]>;
}
export declare const ownerDetectorService: OwnerDetectorService;
//# sourceMappingURL=owner-detector.service.d.ts.map