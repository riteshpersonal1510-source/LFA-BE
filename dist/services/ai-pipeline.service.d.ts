export interface PipelineStepResult {
    step: string;
    success: boolean;
    error?: string;
}
export declare class AIPipelineService {
    runPipeline(leadId: string): Promise<{
        success: boolean;
        errors: string[];
    }>;
}
export declare const aiPipelineService: AIPipelineService;
//# sourceMappingURL=ai-pipeline.service.d.ts.map