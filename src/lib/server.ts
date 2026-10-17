import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'api-url';
const TAILSCALE_HTTPS_PORT = '8443';
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3101/api';

// On the phone, "localhost" is the phone itself, so the backend URL (the
// Tailscale IP of the office PC, 100.x.y.z) is set from the login screen and
// remembered.
export function getApiUrl(): string {
  try {
    // Normalized again so addresses saved by older versions get today's rules
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeApiUrl(saved) : DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export function setApiUrl(url: string) {
  const normalized = normalizeApiUrl(url);
  if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
  else localStorage.removeItem(STORAGE_KEY);
}

// Accepts "100.101.102.103", "100.101.102.103:3101" or a full URL and returns
// e.g. "http://100.101.102.103:3101/api". An https Tailscale name without a
// port gets the `tailscale serve` port (8443), since nothing answers on 443.
export function normalizeApiUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  const parsed = new URL(url);
  if (!parsed.port && parsed.protocol === 'http:') parsed.port = '3101';
  if (!parsed.port && parsed.protocol === 'https:' && parsed.hostname.endsWith('.ts.net')) parsed.port = TAILSCALE_HTTPS_PORT;
  if (parsed.pathname === '/' || parsed.pathname === '') parsed.pathname = '/api';
  return parsed.toString().replace(/\/+$/, '');
}

export function hasCustomApiUrl(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export const isNativeApp = Capacitor.isNativePlatform();
