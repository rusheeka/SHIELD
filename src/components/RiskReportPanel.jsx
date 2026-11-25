import {
  AlertTriangleIcon,
  CheckCircleIcon,
  FlagIcon,
  ShieldIcon,
  XCircleIcon,
} from './Icons.jsx';

function getToneClass(riskLevel) {
  if (riskLevel === 'HIGH') return 'danger';
  if (riskLevel === 'MEDIUM') return 'warning';
  return 'safe';
}

function getStatusIcon(status) {
  if (status === 'PASS') return <CheckCircleIcon size={16} className="icon-safe" />;
  if (status === 'WARN') return <AlertTriangleIcon size={16} className="icon-warning" />;
  return <XCircleIcon size={16} className="icon-danger" />;
}

export function RiskReportPanel({ result, onReportThreat }) {
  if (!result) {
    return (
      <section className="panel report-panel report-empty" aria-label="Threat Assessment Results">
        <div className="empty-shield-wrap">
          <ShieldIcon size={36} />
        </div>
        <h2>Ready for Pre-Transaction Validation</h2>
        <p>
          Select a quick scenario or submit a QR code, UPI URI, or payment URL to compute its
          AI risk score, gateway authenticity checks, and safety recommendations.
        </p>
      </section>
    );
  }

  const tone = getToneClass(result.riskLevel);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.riskScore / 100) * circumference;

  return (
    <section className="panel report-panel" aria-label="Threat Assessment Results" aria-live="polite">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Threat &amp; Risk Assessment</h2>
          <p className="panel-subtitle">
            Engine: {result.mode === 'backend' ? 'Python Scikit-learn API' : 'Client ML Simulation'}
            {' • '}Confidence: {Math.round((result.confidence || 0.9) * 100)}%
          </p>
        </div>
        <span className={`verdict-pill verdict-${tone}`}>
          {result.riskLevel} RISK
        </span>
      </div>

      {/* Hero Risk Gauge + Verdict Summary */}
      <div className={`risk-hero risk-hero-${tone}`}>
        <div className="gauge-box" aria-label={`Risk score ${result.riskScore} out of 100`}>
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r={radius} className="gauge-track" />
            <circle
              cx="62"
              cy="62"
              r={radius}
              className={`gauge-fill gauge-${tone}`}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-center">
            <span className="gauge-number">{result.riskScore}</span>
            <span className="gauge-unit">/ 100</span>
          </div>
        </div>

        <div className="risk-summary-copy">
          <h3 className="verdict-title">{result.verdict}</h3>
          <div className="target-meta-grid">
            <div>
              <span className="meta-label">Target VPA / Host</span>
              <span className="meta-value mono-text">{result.target}</span>
            </div>
            <div>
              <span className="meta-label">Payee / Context</span>
              <span className="meta-value">{result.payeeName}</span>
            </div>
            <div>
              <span className="meta-label">Channel</span>
              <span className="meta-value">{result.channel}</span>
            </div>
            <div>
              <span className="meta-label">Amount</span>
              <span className="meta-value">
                {result.amount > 0 ? `₹${result.amount.toLocaleString('en-IN')}` : 'Not Locked'}
              </span>
            </div>
          </div>

          {result.riskLevel !== 'LOW' && (
            <div className="report-action-row">
              <button
                type="button"
                className={result.reported ? 'btn-secondary btn-compact' : 'btn-danger btn-compact'}
                disabled={result.reported}
                onClick={() => onReportThreat(result.id)}
              >
                <FlagIcon size={14} />
                <span>{result.reported ? 'Threat Logged & Reported' : 'Block & Report Threat'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secure Gateway Validation Checks */}
      <div className="report-section">
        <h3 className="section-heading">Secure Gateway Validation</h3>
        <div className="gateway-list">
          {result.gatewayChecks.map((check) => (
            <div key={check.id} className="gateway-row">
              <div className="gateway-row-head">
                {getStatusIcon(check.status)}
                <strong>{check.label}</strong>
                <span className={`check-badge check-${check.status.toLowerCase()}`}>
                  {check.status}
                </span>
              </div>
              <p className="gateway-detail">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ML Feature Weights & Risk Indicators */}
      <div className="report-columns">
        <div className="report-section">
          <h3 className="section-heading">Detected Risk Indicators</h3>
          <ul className="indicator-list">
            {result.indicators.length === 0 ? (
              <li className="indicator-item indicator-low">
                <strong>No malicious indicators triggered</strong>
                <p>Payload syntax, PSP handle, and context appear clean.</p>
              </li>
            ) : (
              result.indicators.map((ind, idx) => (
                <li key={`${ind.title}-${idx}`} className={`indicator-item indicator-${ind.severity}`}>
                  <strong>{ind.title}</strong>
                  <p>{ind.detail}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="report-section">
          <h3 className="section-heading">Model Risk Feature Breakdown</h3>
          <div className="feature-bars">
            {result.featureContributions.map((item) => (
              <div key={item.feature} className="feature-bar-row">
                <div className="feature-bar-labels">
                  <span>{item.feature}</span>
                  <span className="mono-text">+{item.impact} pts</span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill bar-${tone}`}
                    style={{ width: `${Math.min(100, item.impact * 2.2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="section-heading recs-heading">Security Recommendations</h3>
          <ul className="recommendations-list">
            {result.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

