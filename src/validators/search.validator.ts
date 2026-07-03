import { z } from 'zod';

export const searchRequestSchema = z.object({
  body: z.object({
    keyword: z.string().min(1, 'Keyword is required').max(255),
    location: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    country: z.string().optional(),
    businessType: z.string().optional(),
    sources: z.array(z.string()).optional(),
    limit: z.number().optional().default(0),
    sessionId: z.string().optional(),
    semanticExpansion: z.boolean().optional(),
    maxResults: z.number().optional(),
  }).passthrough(),
});

export type SearchRequestDTO = z.infer<typeof searchRequestSchema>;
