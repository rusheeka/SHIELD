/**
 * Parses raw QR payload text, UPI intent URIs, or payment URLs into normalized fields.
 */
export function parsePaymentPayload(rawInput = '') {
  const trimmed = String(rawInput).trim();
  if (!trimmed) {
    return {
      kind: 'empty',
      rawPayload: '',
      vpa: '',
      vpaHandle: '',
      payeeName: '',
      amount: null,
      currency: 'INR',
      note: '',
      merchantCode: '',
      domain: '',
      protocol: '',
      isCollectRequest: false,
    };
  }

  const lower = trimmed.toLowerCase();

  // UPI URI handling (upi://pay?... or upi://collect?...)
  if (lower.startsWith('upi://')) {
    const schemeMatch = lower.match(/^upi:\/\/([a-z]+)/);
    const action = schemeMatch ? schemeMatch[1] : 'pay';
    const queryIndex = trimmed.indexOf('?');
    const params = new URLSearchParams(queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : '');

    const vpa = (params.get('pa') || '').trim();
    const vpaParts = vpa.split('@');
    const vpaHandle = vpaParts.length === 2 ? vpaParts[1].toLowerCase() : '';
    const amountRaw = params.get('am');
    const parsedAmount = amountRaw !== null && amountRaw !== '' ? Number(amountRaw) : null;

    return {
      kind: 'upi',
      action,
      rawPayload: trimmed,
      vpa,
      vpaHandle,
      payeeName: (params.get('pn') || '').trim(),
      amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
      currency: (params.get('cu') || 'INR').toUpperCase(),
      note: (params.get('tn') || '').trim(),
      merchantCode: (params.get('mc') || '').trim(),
      domain: '',
      protocol: 'upi',
      isCollectRequest: action === 'collect',
    };
  }

  // HTTP / HTTPS payment link handling
  if (lower.startsWith('http://') || lower.startsWith('https://') || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalizedUrl);
      return {
        kind: 'url',
        action: 'web',
        rawPayload: trimmed,
        vpa: '',
        vpaHandle: '',
        payeeName: '',
        amount: null,
        currency: 'INR',
        note: parsed.search ? parsed.search.slice(1) : '',
        merchantCode: '',
        domain: parsed.hostname.toLowerCase(),
        protocol: parsed.protocol.replace(':', '').toLowerCase(),
        path: parsed.pathname,
        isCollectRequest: false,
      };
    } catch {
      // Fall through to generic text/VPA check
    }
  }

  // Standalone VPA (e.g., merchant@okicici)
  if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(trimmed)) {
    const [, handle = ''] = trimmed.split('@');
    return {
      kind: 'vpa',
      action: 'pay',
      rawPayload: trimmed,
      vpa: trimmed,
      vpaHandle: handle.toLowerCase(),
      payeeName: '',
      amount: null,
      currency: 'INR',
      note: '',
      merchantCode: '',
      domain: '',
      protocol: 'upi',
      isCollectRequest: false,
    };
  }

  return {
    kind: 'text',
    action: 'unknown',
    rawPayload: trimmed,
    vpa: '',
    vpaHandle: '',
    payeeName: '',
    amount: null,
    currency: 'INR',
    note: trimmed,
    merchantCode: '',
    domain: '',
    protocol: '',
    isCollectRequest: false,
  };
}

