/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : env-config.js
 * Purpose : Centralized environment detection & route helpers
 * ============================================================
 */

export const ENV = {
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isDev: window.location.hostname.includes('development.') || (window.location.hostname.includes('.pages.dev') && !window.location.hostname.startsWith('shaadi-saathi.')),
    isProd: window.location.hostname === 'shaadi-saathi.pages.dev' || (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1') && !window.location.hostname.includes('development.'))
};

export function getWebInvitePreviewUrl(inviteId) {
    if (!inviteId) return '#';
    if (ENV.isLocal) {
        return `${window.location.origin}/#web-invites-preview?id=${encodeURIComponent(inviteId)}`;
    }
    return `${window.location.origin}/web-invites-preview-functions?id=${encodeURIComponent(inviteId)}`;
}