import { analyzePaymentPayload } from '../utils/riskAnalyzer.js';

const DEFAULT_API_BASE = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Checks whether the Python (OpenCV + Scikit-learn) backend service is reachable.
 */
export async function checkBackendHealth(baseUrl = DEFAULT_API_BASE) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return { online: false, engine: 'Simulation Engine' };
    }
    const data = await response.json().catch(() => ({}));
    return {
      online: true,
      engine: data.engine || 'Python OpenCV + Scikit-learn API',
    };
  } catch {
    clearTimeout(timeoutId);
    return { online: false, engine: 'Client ML Simulation Mode' };
  }
}

/**
 * Attempts to decode an uploaded QR image using the browser BarcodeDetector API (when available)
 * or delegates to the Python OpenCV backend (`/api/analyze/qr`).
 */
export async function decodeQrImageFile(file, baseUrl = DEFAULT_API_BASE) {
  // 1. Try Python OpenCV backend first if reachable
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/decode-qr`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.payload) {
        return { payload: data.payload, decoder: 'Python OpenCV' };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // 2. Fallback to native browser BarcodeDetector API (Chrome/Edge)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      bitmap.close?.();
      if (barcodes.length > 0 && barcodes[0].rawValue) {
        return { payload: barcodes[0].rawValue, decoder: 'Browser BarcodeDetector' };
      }
    } catch {
      // Ignore and let UI guide user to paste payload or run backend
    }
  }

  return {
    payload: '',
    decoder: 'manual-required',
    message:
      'QR image uploaded. Start the Python OpenCV backend (or paste the QR payload / choose a sample preset) to inspect its contents.',
  };
}

/**
 * Sends payment payload & transaction metadata to the Python ML risk-scoring API,
 * seamlessly falling back to the deterministic local risk analyzer if offline.
 */
export async function runThreatAnalysis(request, baseUrl = DEFAULT_API_BASE) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const backendResult = await response.json();
      if (typeof backendResult?.riskScore === 'number') {
        return { ...backendResult, mode: 'backend' };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return analyzePaymentPayload(request);
}

