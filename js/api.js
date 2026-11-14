const config = window.NGD_CONFIG || {};
const API_URL = String(config.apiUrl || '').trim();

export function isConnected() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(API_URL);
}
export function isWriteEnabled() {
  return isConnected() && config.memberWritesEnabled === true;
}
export function createRequestId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '') + 'aa';
  return 'rq_' + String(Date.now()) + '_' + Math.random().toString(36).slice(2, 14);
}
export class ApiError extends Error {
  constructor(message, code = 'NETWORK_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}
export async function api(action, payload = {}, token = '', options = {}) {
  if (!isConnected()) throw new ApiError('Sistem akun sedang tidak dapat diakses. Silakan coba kembali.', 'NOT_CONFIGURED');
  const {write = false, timeoutMs = 24000, requestId = null} = options;
  if (requestId !== null && !/^[A-Za-z0-9_-]{16,80}$/.test(String(requestId)))
    throw new ApiError('ID permintaan tidak valid.', 'VALIDATION');
  if (write && !isWriteEnabled()) throw new ApiError('Penyimpanan data sedang tidak tersedia.', 'PREVIEW_ONLY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // text/plain avoids cross-origin JSON preflight on Apps Script Web Apps.
    // Never use mode:no-cors: it would conceal server responses and errors.
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, payload, token, request_id: requestId === null ? createRequestId() : String(requestId)}),
      redirect: 'follow',
      signal: controller.signal,
      credentials: 'omit'
    });
    if (!response.ok) throw new ApiError('Layanan merespons kode ' + response.status);
    const data = await response.json();
    if (!data || typeof data.ok !== 'boolean') throw new ApiError('Layanan belum dapat memproses permintaan Anda.');
    if (!data.ok) throw new ApiError(data.error?.message || 'Permintaan gagal.', data.error?.code || 'API_ERROR');
    return data.data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new ApiError('Permintaan terlalu lama. Periksa koneksi lalu coba lagi.');
    if (error instanceof ApiError) throw error;
    throw new ApiError('Koneksi layanan terganggu. Periksa internet Anda lalu coba kembali.');
  } finally {
    clearTimeout(timer);
  }
}
