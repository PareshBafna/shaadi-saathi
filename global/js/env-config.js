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

export function getWebInvitePreviewUrl(inviteId, variantId = null) {
    if (!inviteId) return '#';

    let queryParams = `id=${encodeURIComponent(inviteId)}`;
    if (variantId) {
        queryParams += `&variant_id=${encodeURIComponent(variantId)}`;
    }

    if (ENV.isLocal) {
        return `${window.location.origin}/#web-invites-preview?${queryParams}`;
    }
    return `${window.location.origin}/web-invites-preview-functions?${queryParams}`;
}

export function getWebInvitePublicPreviewUrl(weddingId, variantId = null) {
    if (!weddingId) return '#';

    let queryParams = `id=${encodeURIComponent(weddingId)}`;
    if (variantId) {
        queryParams += `&variant_id=${encodeURIComponent(variantId)}`;
    }

    if (ENV.isLocal) {
        return `${window.location.origin}/#web-invites-public-preview?${queryParams}`;
    }
    return `${window.location.origin}/web-invites-public-preview-functions?${queryParams}`;
}

export function getSampleWebInvitePreviewUrl(sampleId = 'sample-upcoming') {
    if (ENV.isLocal) {
        return `${window.location.origin}/#sample-web-invites-preview?id=${encodeURIComponent(sampleId)}`;
    }
    return `${window.location.origin}/sample-web-invites-preview-functions?id=${encodeURIComponent(sampleId)}`;
}