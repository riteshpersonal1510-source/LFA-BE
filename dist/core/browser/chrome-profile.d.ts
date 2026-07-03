export interface ChromeProfile {
    executablePath: string;
    userDataDir: string;
    profileDir: string;
    profileName: string;
    isRunning: boolean;
}
export declare function detectChromeProfile(): ChromeProfile | null;
export declare function getAvailableChromeProfiles(userDataDir: string): string[];
export declare function getProfileNameFromPreferences(userDataDir: string, profileName: string): string;
export declare function checkChromeCdpAvailability(port?: number): Promise<boolean>;
//# sourceMappingURL=chrome-profile.d.ts.map