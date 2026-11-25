import { useEffect, useRef, useState } from 'react';

export function ConfigModal({ isOpen, apiBaseUrl, onSaveApiUrl, onClose }) {
  const dialogRef = useRef(null);
  const [urlDraft, setUrlDraft] = useState(apiBaseUrl);

  useEffect(() => {
    setUrlDraft(apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleSave(event) {
    event.preventDefault();
    onSaveApiUrl(urlDraft.trim() || 'http://localhost:8000');
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="shield-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-header">
        <div>
          <h2>SHIELD System Architecture &amp; Integration</h2>
          <p>Team-B2 Capstone Configuration (Python OpenCV + Scikit-learn + Supabase)</p>
        </div>
        <button type="button" className="btn-ghost btn-compact" onClick={onClose}>
          Close
        </button>
      </div>

      <form onSubmit={handleSave} className="dialog-body">
        <div className="arch-pipeline">
          <span>1. React.js UI</span>
          <span>→</span>
          <span>2. OpenCV QR Decoder</span>
          <span>→</span>
          <span>3. Scikit-learn Risk Model</span>
          <span>→</span>
          <span>4. Gateway Validator</span>
          <span>→</span>
          <span>5. Supabase Audit DB</span>
        </div>

        <div className="field-group">
          <label htmlFor="api-url-input" className="field-label">
            Python Backend API URL
          </label>
          <input
            id="api-url-input"
            type="url"
            className="field-control mono-input"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <small className="field-help">
            Expected endpoints: <code>GET /api/health</code>, <code>POST /api/decode-qr</code>,
            and <code>POST /api/analyze</code>. Automatically uses local ML simulation if offline.
          </small>
        </div>

        <div className="credits-box">
          <div>
            <strong>Team Members (Team-B2)</strong>
            <ul>
              <li>S. Vyshnavi — 24245A1212</li>
              <li>K. Srikari — 23241A1296</li>
              <li>A. Rusheeka — 23241A1267</li>
            </ul>
          </div>
          <div>
            <strong>Project Guide</strong>
            <p>Dr. Y. J. Nagendra Kumar (HOD - IT)</p>
          </div>
        </div>

        <div className="dialog-footer">
          <button type="submit" className="btn-primary">
            Save &amp; Reconnect
          </button>
        </div>
      </form>
    </dialog>
  );
}

