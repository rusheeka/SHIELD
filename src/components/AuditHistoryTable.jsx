import { useMemo, useState } from 'react';
import { FlagIcon } from './Icons.jsx';

export function AuditHistoryTable({ logs, onSelectLog, onReportThreat }) {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((item) => {
      const matchesLevel = filterLevel === 'ALL' || item.riskLevel === filterLevel;
      const matchesQuery =
        !query ||
        item.target?.toLowerCase().includes(query) ||
        item.payeeName?.toLowerCase().includes(query) ||
        item.verdict?.toLowerCase().includes(query) ||
        item.channel?.toLowerCase().includes(query);
      return matchesLevel && matchesQuery;
    });
  }, [logs, filterLevel, searchQuery]);

  return (
    <section className="panel audit-panel" aria-label="Scan History and Threat Audit Log">
      <div className="panel-header audit-header">
        <div>
          <h2 className="panel-title">Transaction Threat Audit Log</h2>
          <p className="panel-subtitle">
            Historical QR &amp; payment security assessments synced with Supabase / local cache.
          </p>
        </div>

        <div className="audit-controls">
          <input
            type="search"
            className="field-control search-input"
            placeholder="Search VPA, domain, or verdict..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search audit log"
          />

          <div className="filter-pills" role="group" aria-label="Filter by risk level">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <button
                key={level}
                type="button"
                className={`filter-pill ${filterLevel === level ? 'active' : ''}`}
                onClick={() => setFilterLevel(level)}
              >
                {level === 'ALL' ? 'All' : level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Target VPA / Host</th>
              <th>Payee &amp; Channel</th>
              <th>Amount</th>
              <th>Risk Score</th>
              <th>Gateway</th>
              <th>Verdict</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-cell">
                  No scan records match the active filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((row) => {
                const tone =
                  row.riskLevel === 'HIGH'
                    ? 'danger'
                    : row.riskLevel === 'MEDIUM'
                      ? 'warning'
                      : 'safe';
                return (
                  <tr key={row.id} onClick={() => onSelectLog?.(row)} className="audit-row">
                    <td>
                      <div className="mono-text target-cell">{row.target}</div>
                      <span className="sub-meta">{row.inputType}</span>
                    </td>
                    <td>
                      <div>{row.payeeName}</div>
                      <span className="sub-meta">{row.channel}</span>
                    </td>
                    <td className="mono-text">
                      {row.amount > 0 ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <div className="score-inline">
                        <span className={`score-badge score-${tone}`}>{row.riskScore}</span>
                        <div className="mini-bar-track">
                          <div
                            className={`mini-bar-fill bar-${tone}`}
                            style={{ width: `${row.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`check-badge check-${(row.gatewayStatus || 'PASS').toLowerCase()}`}>
                        {row.gatewayStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`verdict-text verdict-text-${tone}`}>{row.verdict}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {row.riskLevel !== 'LOW' ? (
                        <button
                          type="button"
                          className="btn-link-action"
                          disabled={row.reported}
                          onClick={() => onReportThreat(row.id)}
                        >
                          <FlagIcon size={13} />
                          <span>{row.reported ? 'Reported' : 'Report'}</span>
                        </button>
                      ) : (
                        <span className="sub-meta">Verified</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

