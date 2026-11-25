import { DatabaseIcon, ServerIcon, SettingsIcon, ShieldIcon } from './Icons.jsx';

export function Header({ backendStatus, supabaseConnected, onOpenConfig }) {
  return (
    <header className="shield-header">
      <div className="shield-header-inner">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <ShieldIcon size={24} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">SHIELD</h1>
              <span className="team-pill">Team-B2</span>
            </div>
            <p className="brand-subtitle">
              Intelligent QR Code &amp; Digital Payment Threat Detection System
            </p>
          </div>
        </div>

        <div className="header-status-group">
          <div
            className={`status-pill ${backendStatus.online ? 'status-online' : 'status-sim'}`}
            title={backendStatus.engine}
          >
            <ServerIcon size={14} />
            <span>{backendStatus.online ? 'Python ML API: Online' : 'ML Simulation Mode'}</span>
          </div>

          <div
            className={`status-pill ${supabaseConnected ? 'status-online' : 'status-sim'}`}
            title={supabaseConnected ? 'Connected to Supabase PostgreSQL' : 'Using browser local storage'}
          >
            <DatabaseIcon size={14} />
            <span>{supabaseConnected ? 'Supabase: Connected' : 'Local Audit Store'}</span>
          </div>

          <button
            type="button"
            className="btn-secondary btn-compact"
            onClick={onOpenConfig}
          >
            <SettingsIcon size={15} />
            <span>System &amp; API</span>
          </button>
        </div>
      </div>
    </header>
  );
}

