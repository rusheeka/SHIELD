import { ActivityIcon, AlertTriangleIcon, CheckCircleIcon, LockIcon } from './Icons.jsx';

export function StatsOverview({ logs }) {
  const totalScans = logs.length;
  const highRiskCount = logs.filter((l) => l.riskLevel === 'HIGH').length;
  const safeCount = logs.filter((l) => l.riskLevel === 'LOW').length;
  const avgScore =
    totalScans > 0
      ? Math.round(logs.reduce((acc, item) => acc + (Number(item.riskScore) || 0), 0) / totalScans)
      : 0;

  const cards = [
    {
      label: 'Total Requests Scanned',
      value: totalScans,
      hint: 'QR codes, UPI intents & payment links',
      icon: ActivityIcon,
      tone: 'neutral',
    },
    {
      label: 'Threats Intercepted',
      value: highRiskCount,
      hint: 'High-risk fraud & phishing flagged',
      icon: AlertTriangleIcon,
      tone: 'danger',
    },
    {
      label: 'Verified Safe Payments',
      value: safeCount,
      hint: 'Passed secure gateway validation',
      icon: CheckCircleIcon,
      tone: 'safe',
    },
    {
      label: 'Mean Threat Score',
      value: `${avgScore}/100`,
      hint: 'Weighted ML & pattern risk index',
      icon: LockIcon,
      tone: avgScore >= 60 ? 'danger' : avgScore >= 30 ? 'warning' : 'safe',
    },
  ];

  return (
    <section className="stats-grid" aria-label="Threat Detection Summary">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className={`stat-card stat-${card.tone}`}>
            <div className="stat-header">
              <span className="stat-label">{card.label}</span>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </div>
            <div className="stat-value">{card.value}</div>
            <p className="stat-hint">{card.hint}</p>
          </article>
        );
      })}
    </section>
  );
}

