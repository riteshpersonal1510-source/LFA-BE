import { existsSync, readFileSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export interface ChromeProfile {
  executablePath: string;
  userDataDir: string;
  profileDir: string;
  profileName: string;
  isRunning: boolean;
}

function findSystemChromeByWhich(): string | null {
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
  for (const name of candidates) {
    try {
      const resolved = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (resolved && existsSync(resolved)) return resolved;
    } catch {
      continue;
    }
  }
  return null;
}

function findPlaywrightChromium(): string | null {
  try {
    const pw = require('playwright');
    const execPath = pw.chromium.executablePath();
    if (existsSync(execPath)) return execPath;
  } catch {
    return null;
  }
  return null;
}

function detectLinuxChrome(): ChromeProfile | null {
  const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
  if (!executablePath) return null;

  const userDataDirs = [
    join(homedir(), '.config', 'google-chrome'),
    join(homedir(), '.config', 'chromium'),
  ];

  for (const userDataDir of userDataDirs) {
    if (existsSync(userDataDir)) {
      const profileDir = join(userDataDir, 'Default');
      const isRunning = existsSync(join(userDataDir, 'SingletonLock')) ||
                        existsSync(join(userDataDir, 'SingletonSocket'));
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

function detectWindowsChrome(): ChromeProfile | null {
  const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
  if (!executablePath) return null;

  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  const userDataDir = join(localAppData, 'Google', 'Chrome', 'User Data');
  if (!existsSync(userDataDir)) return null;

  const profileDir = join(userDataDir, 'Default');
  const isRunning = existsSync(join(userDataDir, 'SingletonLock'));

  return {
    executablePath,
    userDataDir,
    profileDir,
    profileName: 'Default',
    isRunning,
  };
}

function detectMacChrome(): ChromeProfile | null {
  const executablePath = findSystemChromeByWhich() || findPlaywrightChromium();
  if (!executablePath) return null;

  const userDataDir = join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  if (!existsSync(userDataDir)) return null;

  const profileDir = join(userDataDir, 'Default');
  const isRunning = existsSync(join(userDataDir, 'SingletonLock'));

  return {
    executablePath,
    userDataDir,
    profileDir,
    profileName: 'Default',
    isRunning,
  };
}

export function detectChromeProfile(): ChromeProfile | null {
  const os = platform();
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

export function getAvailableChromeProfiles(userDataDir: string): string[] {
  const profiles: string[] = ['Default'];
  if (!existsSync(userDataDir)) return profiles;

  const entries = ['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', 'Profile 5', 'Profile 10', 'Profile 11', 'Profile 12', 'Profile 16', 'Profile 17', 'Profile 21', 'Profile 22'];
  for (const entry of entries) {
    const profilePath = join(userDataDir, entry);
    if (existsSync(profilePath) && existsSync(join(profilePath, 'Preferences'))) {
      profiles.push(entry);
    }
  }

  return profiles;
}

export function getProfileNameFromPreferences(userDataDir: string, profileName: string): string {
  try {
    const prefsPath = join(userDataDir, profileName, 'Preferences');
    if (!existsSync(prefsPath)) return profileName;

    const prefs = JSON.parse(readFileSync(prefsPath, 'utf-8'));
    return prefs?.profile?.name || profileName;
  } catch {
    return profileName;
  }
}

export function checkChromeCdpAvailability(port = 9222): Promise<boolean> {
  const url = `http://127.0.0.1:${port}/json/version`;
  return fetch(url, { signal: AbortSignal.timeout(2000) })
    .then((r) => r.ok)
    .catch(() => false);
}
