import { useEffect, useState } from 'react';
import { Header } from './components/Header.jsx';
import { StatsOverview } from './components/StatsOverview.jsx';
import { ScannerPanel } from './components/ScannerPanel.jsx';
import { RiskReportPanel } from './components/RiskReportPanel.jsx';
import { AuditHistoryTable } from './components/AuditHistoryTable.jsx';
import { ConfigModal } from './components/ConfigModal.jsx';
import { SAMPLE_SCENARIOS } from './data/presets.js';
import { checkBackendHealth, runThreatAnalysis } from './services/shieldApi.js';
import {
  fetchScanHistory,
  isSupabaseConnected,
  markThreatReported,
  saveScanRecord,
} from './services/supabaseClient.js';
import { analyzePaymentPayload } from './utils/riskAnalyzer.js';

const DEFAULT_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_URL);
  const [backendStatus, setBackendStatus] = useState({
    online: false,
    engine: 'Client ML Simulation Mode',
  });
  const [logs, setLogs] = useState([]);
  const [currentResult, setCurrentResult] = useState(() =>
    analyzePaymentPayload({
      payload: SAMPLE_SCENARIOS[1].payload,
      channel: SAMPLE_SCENARIOS[1].channel,
      inputType: 'QR Payload',
    }),
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const supabaseConnected = isSupabaseConnected();

  useEffect(() => {
    let active = true;
    fetchScanHistory().then(({ logs: loaded }) => {
      if (active) setLogs(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    checkBackendHealth(apiBaseUrl).then((status) => {
      if (active) setBackendStatus(status);
    });
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  async function handleAnalyze(request) {
    setIsAnalyzing(true);
    try {
      const result = await runThreatAnalysis(request, apiBaseUrl);
      setCurrentResult(result);
      const updatedLogs = await saveScanRecord(result);
      setLogs(updatedLogs);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleReportThreat(scanId) {
    const updatedLogs = await markThreatReported(scanId);
    setLogs(updatedLogs);
    if (currentResult && currentResult.id === scanId) {
      setCurrentResult({ ...currentResult, reported: true });
    }
  }

  function handleSelectAuditRow(row) {
    // Re-run local inspection if user clicks an audit log item so full gateway checks appear
    const fallbackPayload =
      row.target && row.target.includes('@')
        ? `upi://pay?pa=${encodeURIComponent(row.target)}&pn=${encodeURIComponent(row.payeeName || '')}&am=${row.amount || ''}`
        : row.target || '';

    const rehydrated = analyzePaymentPayload({
      payload: fallbackPayload,
      channel: row.channel,
      inputType: row.inputType,
      payeeName: row.payeeName,
      amount: row.amount,
    });

    setCurrentResult({
      ...rehydrated,
      id: row.id,
      riskScore: row.riskScore,
      riskLevel: row.riskLevel,
      verdict: row.verdict,
      gatewayStatus: row.gatewayStatus,
      reported: Boolean(row.reported),
    });
  }

  return (
    <div className="shield-app">
      <Header
        backendStatus={backendStatus}
        supabaseConnected={supabaseConnected}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      <main className="shield-main">
        <StatsOverview logs={logs} />

        <div className="workspace-grid">
          <ScannerPanel
            apiBaseUrl={apiBaseUrl}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
          />
          <RiskReportPanel
            result={currentResult}
            onReportThreat={handleReportThreat}
          />
        </div>

        <AuditHistoryTable
          logs={logs}
          onSelectLog={handleSelectAuditRow}
          onReportThreat={handleReportThreat}
        />
      </main>

      <footer className="shield-footer">
        <span>
          SHIELD Framework • Team-B2 (S. Vyshnavi, K. Srikari, A. Rusheeka) • Guide: Dr. Y. J.
          Nagendra Kumar, HOD - IT
        </span>
      </footer>

      <ConfigModal
        isOpen={isConfigOpen}
        apiBaseUrl={apiBaseUrl}
        onSaveApiUrl={setApiBaseUrl}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}

