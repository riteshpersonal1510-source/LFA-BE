"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectChromeProfile = detectChromeProfile;
exports.getAvailableChromeProfiles = getAvailableChromeProfiles;
exports.getProfileNameFromPreferences = getProfileNameFromPreferences;
exports.checkChromeCdpAvailability = checkChromeCdpAvailability;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const child_process_1 = require("child_process");
function findSystemChromeByWhich() {
    const candidates = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
    for (const name of candidates) {
        try {
            const resolved = (0, child_process_1.execSync)(`which ${name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
            if (resolved && (0, fs_1.existsSync)(resolved))
                return resolved;
        }
        catch {
            continue;
        }
    }
    return null;
}
function findPlaywrightChromium() {
    try {
        const pw = require('playwright');
        const execPath = pw.chromium.executablePath();
        if ((0, fs_1.existsSync)(execPath))
            return execPath;
    }
    catch {
        return null;
    }
    return null;
}
function detectLinuxChrome() {
    const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
    if (!executablePath)
        return null;
    const userDataDirs = [
        (0, path_1.join)((0, os_1.homedir)(), '.config', 'google-chrome'),
        (0, path_1.join)((0, os_1.homedir)(), '.config', 'chromium'),
    ];
    for (const userDataDir of userDataDirs) {
        if ((0, fs_1.existsSync)(userDataDir)) {
            const profileDir = (0, path_1.join)(userDataDir, 'Default');
            const isRunning = (0, fs_1.existsSync)((0, path_1.join)(userDataDir, 'SingletonLock')) ||
                (0, fs_1.existsSync)((0, path_1.join)(userDataDir, 'SingletonSocket'));
            return {
                executablePath,
                userDataDir,
                profileDir,
                profileName: 'Default',
                isRunning,
            };
        }
    }
    return null;
}
function detectWindowsChrome() {
    const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
    if (!executablePath)
        return null;
    const localAppData = process.env.LOCALAPPDATA || (0, path_1.join)((0, os_1.homedir)(), 'AppData', 'Local');
    const userDataDir = (0, path_1.join)(localAppData, 'Google', 'Chrome', 'User Data');
    if (!(0, fs_1.existsSync)(userDataDir))
        return null;
    const profileDir = (0, path_1.join)(userDataDir, 'Default');
    const isRunning = (0, fs_1.existsSync)((0, path_1.join)(userDataDir, 'SingletonLock'));
    return {
        executablePath,
        userDataDir,
        profileDir,
        profileName: 'Default',
        isRunning,
    };
}
function detectMacChrome() {
    const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
    if (!executablePath)
        return null;
    const userDataDir = (0, path_1.join)((0, os_1.homedir)(), 'Library', 'Application Support', 'Google', 'Chrome');
    if (!(0, fs_1.existsSync)(userDataDir))
        return null;
    const profileDir = (0, path_1.join)(userDataDir, 'Default');
    const isRunning = (0, fs_1.existsSync)((0, path_1.join)(userDataDir, 'SingletonLock'));
    return {
        executablePath,
        userDataDir,
        profileDir,
        profileName: 'Default',
        isRunning,
    };
}
function detectChromeProfile() {
    const os = (0, os_1.platform)();
    switch (os) {
        case 'linux':
            return detectLinuxChrome();
        case 'win32':
            return detectWindowsChrome();
        case 'darwin':
            return detectMacChrome();
        default:
            return detectLinuxChrome();
    }
}
function getAvailableChromeProfiles(userDataDir) {
    const profiles = ['Default'];
    if (!(0, fs_1.existsSync)(userDataDir))
        return profiles;
    const entries = ['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', 'Profile 5', 'Profile 10', 'Profile 11', 'Profile 12', 'Profile 16', 'Profile 17', 'Profile 21', 'Profile 22'];
    for (const entry of entries) {
        const profilePath = (0, path_1.join)(userDataDir, entry);
        if ((0, fs_1.existsSync)(profilePath) && (0, fs_1.existsSync)((0, path_1.join)(profilePath, 'Preferences'))) {
            profiles.push(entry);
        }
    }
    return profiles;
}
function getProfileNameFromPreferences(userDataDir, profileName) {
    try {
        const prefsPath = (0, path_1.join)(userDataDir, profileName, 'Preferences');
        if (!(0, fs_1.existsSync)(prefsPath))
            return profileName;
        const prefs = JSON.parse((0, fs_1.readFileSync)(prefsPath, 'utf-8'));
        return prefs?.profile?.name || profileName;
    }
    catch {
        return profileName;
    }
}
function checkChromeCdpAvailability(port = 9222) {
    const url = `http://127.0.0.1:${port}/json/version`;
    return fetch(url, { signal: AbortSignal.timeout(2000) })
        .then((r) => r.ok)
        .catch(() => false);
}
//# sourceMappingURL=chrome-profile.js.map