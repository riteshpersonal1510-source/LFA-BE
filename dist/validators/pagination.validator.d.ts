import { z } from 'zod';
export declare const paginationQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        keyword: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        minRating: z.ZodOptional<z.ZodString>;
        minLeadScore: z.ZodOptional<z.ZodString>;
        websiteStatus: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: string;
        page: string;
        keyword?: string | undefined;
        category?: string | undefined;
        websiteStatus?: string | undefined;
        minRating?: string | undefined;
        minLeadScore?: string | undefined;
    }, {
        keyword?: string | undefined;
        category?: string | undefined;
        websiteStatus?: string | undefined;
        limit?: string | undefined;
        page?: string | undefined;
        minRating?: string | undefined;
        minLeadScore?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: string;
        page: string;
        keyword?: string | undefined;
        category?: string | undefined;
        websiteStatus?: string | undefined;
        minRating?: string | undefined;
        minLeadScore?: string | undefined;
    };
}, {
    query: {
        keyword?: string | undefined;
        category?: string | undefined;
        websiteStatus?: string | undefined;
        limit?: string | undefined;
        page?: string | undefined;
        minRating?: string | undefined;
        minLeadScore?: string | undefined;
    };
}>;
export type PaginationQueryDTO = z.infer<typeof paginationQuerySchema>;
//# sourceMappingURL=pagination.validator.d.ts.map