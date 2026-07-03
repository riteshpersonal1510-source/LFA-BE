import { z } from 'zod';
export declare const searchRequestSchema: z.ZodObject<{
    body: z.ZodObject<{
        keyword: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        businessType: z.ZodOptional<z.ZodString>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        sessionId: z.ZodOptional<z.ZodString>;
        semanticExpansion: z.ZodOptional<z.ZodBoolean>;
        maxResults: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        keyword: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        businessType: z.ZodOptional<z.ZodString>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        sessionId: z.ZodOptional<z.ZodString>;
        semanticExpansion: z.ZodOptional<z.ZodBoolean>;
        maxResults: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        keyword: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        businessType: z.ZodOptional<z.ZodString>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        sessionId: z.ZodOptional<z.ZodString>;
        semanticExpansion: z.ZodOptional<z.ZodBoolean>;
        maxResults: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    body: {
        keyword: string;
        limit: number;
        location?: string | undefined;
        sources?: string[] | undefined;
        state?: string | undefined;
        city?: string | undefined;
        area?: string | undefined;
        country?: string | undefined;
        sessionId?: string | undefined;
        businessType?: string | undefined;
        maxResults?: number | undefined;
        semanticExpansion?: boolean | undefined;
    } & {
        [k: string]: unknown;
    };
}, {
    body: {
        keyword: string;
        location?: string | undefined;
        sources?: string[] | undefined;
        limit?: number | undefined;
        state?: string | undefined;
        city?: string | undefined;
        area?: string | undefined;
        country?: string | undefined;
        sessionId?: string | undefined;
        businessType?: string | undefined;
        maxResults?: number | undefined;
        semanticExpansion?: boolean | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
export type SearchRequestDTO = z.infer<typeof searchRequestSchema>;
//# sourceMappingURL=search.validator.d.ts.map