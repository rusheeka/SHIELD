import { createClient } from '@supabase/supabase-js';
import { INITIAL_AUDIT_LOGS } from '../data/presets.js';

const STORAGE_KEY = 'shield_scan_logs_v1';

const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || '';

const isConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-ref');

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function isSupabaseConnected() {
  return Boolean(supabase);
}

function readLocalLogs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

function writeLocalLogs(logs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

/**
 * Fetches scan audit history from Supabase `scan_logs` table with local fallback.
 */
export async function fetchScanHistory() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scan_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        return { logs: data, source: 'supabase' };
      }
    } catch {
      // Fallback to local logs if table or network is unavailable
    }
  }

  return { logs: readLocalLogs(), source: 'local' };
}

/**
 * Persists a newly evaluated scan to Supabase and local storage.
 */
export async function saveScanRecord(result) {
  const record = {
    id: result.id,
    timestamp: result.timestamp,
    channel: result.channel,
    inputType: result.inputType,
    target: result.target,
    payeeName: result.payeeName,
    amount: result.amount,
    currency: result.currency,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    verdict: result.verdict,
    gatewayStatus: result.gatewayStatus,
    mode: result.mode,
    reported: Boolean(result.reported),
  };

  const current = readLocalLogs();
  const updated = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 60);
  writeLocalLogs(updated);

  if (supabase) {
    try {
      await supabase.from('scan_logs').upsert(record);
    } catch {
      // Local cache already saved
    }
  }

  return updated;
}

/**
 * Flags a suspicious scan record as reported in Supabase / local cache.
 */
export async function markThreatReported(scanId) {
  const current = readLocalLogs();
  const updated = current.map((item) =>
    item.id === scanId ? { ...item, reported: true } : item,
  );
  writeLocalLogs(updated);

  if (supabase) {
    try {
      await supabase.from('scan_logs').update({ reported: true }).eq('id', scanId);
    } catch {
      // Local state already updated
    }
  }

  return updated;
}

