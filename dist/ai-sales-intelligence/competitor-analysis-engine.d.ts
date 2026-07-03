export declare class CompetitorAnalysisEngine {
    analyze(context: {
        totalLeadsInSameArea: number;
        totalLeadsInSameCategory: number;
        averageScoreInCategory: number;
        averageTrustScoreInCategory: number;
        leadScore: number;
        trustScore: number;
    }): {
        competitionLevel: 'low' | 'medium' | 'high';
        marketOpportunity: 'low' | 'medium' | 'high';
    };
}
export declare const competitorAnalysisEngine: CompetitorAnalysisEngine;
//# sourceMappingURL=competitor-analysis-engine.d.ts.map