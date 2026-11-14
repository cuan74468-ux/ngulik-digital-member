/* CI-only origin test. Does not send credentials or invoke mutations. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('api-check') !== '1') return;
  const result = document.createElement('output');
  result.id = 'qa-api-transport';
  result.textContent = 'API_BROWSER_PENDING';
  document.body.appendChild(result);
  const endpoint = String(window.NGD_CONFIG?.apiUrl || '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)) {
    result.textContent = 'API_BROWSER_CONFIG_ERROR';
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({action:'getPublicInfo',payload:{},token:'',
      request_id:'READ_ONLY_BROWSER_ORIGIN'}),
    redirect:'follow', credentials:'omit', signal:controller.signal
  })
  .then(r => {if (!r.ok) throw new Error('HTTP_'+r.status);return r.json();})
  .then(d=>{
    if (d?.ok === true && typeof d.data?.nama_brand === 'string')
      result.textContent = 'API_BROWSER_READ_OK';
    else result.textContent = 'API_BROWSER_RESPONSE_INVALID';
  })
  .catch(err => {
    result.textContent = 'API_BROWSER_READ_FAILED_'+String(err?.name || 'NETWORK');
  })
  .finally(()=>clearTimeout(timeout));
})();
