export interface OutreachHistoryEntry {
    type: 'email' | 'whatsapp' | 'proposal' | 'followup';
    content: string;
    subject?: string;
    generatedAt: Date;
    status: 'pending' | 'sent' | 'opened' | 'responded';
    followUpStage?: number;
    response?: string;
}
export declare class OutreachHistoryService {
    addEntry(leadId: string, entry: OutreachHistoryEntry): Promise<void>;
    updateStatus(leadId: string, entryId: string, status: OutreachHistoryEntry['status'], response?: string): Promise<void>;
    getHistory(leadId: string): Promise<OutreachHistoryEntry[]>;
    private getCRMStatus;
}
export declare const outreachHistoryService: OutreachHistoryService;
//# sourceMappingURL=outreach-history.service.d.ts.map