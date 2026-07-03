import { ILead } from '../models/Lead';
import { SalesIntelligenceReport, SalesAnalysisOptions, CompetitorContext } from './types';
export declare class SalesIntelligenceEngine {
    analyze(lead: ILead, competitorContext?: CompetitorContext, _options?: SalesAnalysisOptions): Promise<SalesIntelligenceReport>;
    private getDefaultReport;
}
export declare const salesIntelligenceEngine: SalesIntelligenceEngine;
//# sourceMappingURL=sales-intelligence-engine.d.ts.map