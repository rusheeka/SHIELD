import { useMemo, useRef, useState } from 'react';
import { SAMPLE_SCENARIOS } from '../data/presets.js';
import { parsePaymentPayload } from '../utils/upiParser.js';
import { decodeQrImageFile } from '../services/shieldApi.js';
import { LinkIcon, QrIcon, UploadIcon } from './Icons.jsx';

const CHANNELS = [
  'Point of Sale',
  'Merchant Website',
  'WhatsApp',
  'SMS',
  'Email',
  'Telegram / Social',
  'Unknown Caller',
];

export function ScannerPanel({ apiBaseUrl, isAnalyzing, onAnalyze }) {
  const [inputMode, setInputMode] = useState('payload'); // 'payload' | 'qr'
  const [payload, setPayload] = useState(SAMPLE_SCENARIOS[1].payload);
  const [channel, setChannel] = useState(SAMPLE_SCENARIOS[1].channel);
  const [payeeName, setPayeeName] = useState('');
  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const parsedPreview = useMemo(() => parsePaymentPayload(payload), [payload]);

  function applyScenario(scenario) {
    setPayload(scenario.payload);
    setChannel(scenario.channel);
    setPayeeName('');
    setVpa('');
    setAmount('');
    setNote('');
    setQrStatus('');
    setInputMode('payload');
    onAnalyze({
      payload: scenario.payload,
      channel: scenario.channel,
      inputType: scenario.payload.startsWith('upi://') ? 'QR Payload' : 'Payment URL',
    });
  }

  async function handleQrFile(file) {
    if (!file) return;
    if (qrPreviewUrl) {
      URL.revokeObjectURL(qrPreviewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setQrPreviewUrl(objectUrl);
    setQrStatus('Scanning QR code via OpenCV / browser decoder...');

    const decoded = await decodeQrImageFile(file, apiBaseUrl);
    if (decoded.payload) {
      setPayload(decoded.payload);
      setQrStatus(`Decoded via ${decoded.decoder}`);
      onAnalyze({
        payload: decoded.payload,
        payeeName,
        vpa,
        amount,
        note,
        channel,
        inputType: 'QR Image',
      });
    } else {
      setQrStatus(decoded.message || 'Unable to decode QR automatically; paste URI below.');
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!payload.trim() && !vpa.trim()) return;

    onAnalyze({
      payload: payload.trim() || `upi://pay?pa=${encodeURIComponent(vpa.trim())}`,
      payeeName: payeeName.trim(),
      vpa: vpa.trim(),
      amount,
      note: note.trim(),
      channel,
      inputType: inputMode === 'qr' ? 'QR Image' : parsedPreview.kind === 'url' ? 'Payment URL' : 'QR Payload',
    });
  }

  function handleReset() {
    setPayload('');
    setPayeeName('');
    setVpa('');
    setAmount('');
    setNote('');
    setChannel('Point of Sale');
    setQrStatus('');
    if (qrPreviewUrl) {
      URL.revokeObjectURL(qrPreviewUrl);
      setQrPreviewUrl('');
    }
  }

  return (
    <section className="panel scanner-panel" aria-label="Payment and QR Threat Scanner">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Payment &amp; QR Inspector</h2>
          <p className="panel-subtitle">
            Scan a QR image, UPI intent URI, or payment link before authorizing a transfer.
          </p>
        </div>

        <div className="segmented-tabs" role="tablist" aria-label="Input method">
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === 'payload'}
            className={`tab-btn ${inputMode === 'payload' ? 'active' : ''}`}
            onClick={() => setInputMode('payload')}
          >
            <LinkIcon size={15} />
            <span>Link / UPI URI</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === 'qr'}
            className={`tab-btn ${inputMode === 'qr' ? 'active' : ''}`}
            onClick={() => setInputMode('qr')}
          >
            <QrIcon size={15} />
            <span>Upload QR Image</span>
          </button>
        </div>
      </div>

      {/* Quick Test Scenarios */}
      <div className="presets-block">
        <span className="presets-label">Quick Test Scenarios:</span>
        <div className="presets-row">
          {SAMPLE_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`preset-chip preset-${item.tone}`}
              onClick={() => applyScenario(item)}
              title={item.description}
            >
              <span>{item.label}</span>
              <span className="preset-badge">{item.badge}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="scanner-form">
        {inputMode === 'qr' && (
          <div
            className={`qr-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) handleQrFile(droppedFile);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleQrFile(e.target.files?.[0])}
            />
            {qrPreviewUrl ? (
              <div className="qr-preview-wrap">
                <img src={qrPreviewUrl} alt="Uploaded QR code preview" className="qr-thumb" />
                <div className="qr-preview-meta">
                  <strong>QR Image Loaded</strong>
                  <p>{qrStatus || 'Ready for OpenCV threat inspection.'}</p>
                </div>
              </div>
            ) : (
              <div className="qr-empty-state">
                <UploadIcon size={26} />
                <strong>Drop QR Code image here or click to browse</strong>
                <span>Supports PNG, JPG, WEBP — routed to OpenCV &amp; BarcodeDetector</span>
              </div>
            )}
          </div>
        )}

        <div className="field-group">
          <label htmlFor="payload-input" className="field-label">
            QR Decoded Payload / UPI URI / Payment URL
          </label>
          <textarea
            id="payload-input"
            rows={3}
            className="field-control mono-input"
            placeholder="e.g. upi://pay?pa=merchant@okicici&pn=Store&am=250 or https://..."
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
          {parsedPreview.kind !== 'empty' && (
            <div className="parsed-strip" aria-live="polite">
              <span className="parsed-tag">Type: {parsedPreview.kind.toUpperCase()}</span>
              {parsedPreview.vpa && <span className="parsed-tag">VPA: {parsedPreview.vpa}</span>}
              {parsedPreview.domain && (
                <span className="parsed-tag">Host: {parsedPreview.domain}</span>
              )}
              {parsedPreview.isCollectRequest && (
                <span className="parsed-tag tag-danger">COLLECT REQUEST</span>
              )}
              {parsedPreview.amount !== null && (
                <span className="parsed-tag">
                  Amount: ₹{parsedPreview.amount.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="form-grid-2">
          <div className="field-group">
            <label htmlFor="channel-select" className="field-label">
              Source Channel
            </label>
            <select
              id="channel-select"
              className="field-control"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="amount-input" className="field-label">
              Amount Override (INR)
            </label>
            <input
              id="amount-input"
              type="number"
              min="0"
              step="0.01"
              className="field-control"
              placeholder={
                parsedPreview.amount !== null ? String(parsedPreview.amount) : 'Optional'
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="vpa-input" className="field-label">
              Payee UPI ID / VPA Override
            </label>
            <input
              id="vpa-input"
              type="text"
              className="field-control"
              placeholder={parsedPreview.vpa || 'e.g. merchant@okicici'}
              value={vpa}
              onChange={(e) => setVpa(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="payee-input" className="field-label">
              Display Payee Name
            </label>
            <input
              id="payee-input"
              type="text"
              className="field-control"
              placeholder={parsedPreview.payeeName || 'Optional merchant / sender name'}
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="note-input" className="field-label">
            Transaction Note / Message Context
          </label>
          <input
            id="note-input"
            type="text"
            className="field-control"
            placeholder={parsedPreview.note || 'e.g. Refund claim, KYC verification, Order #104'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={isAnalyzing || (!payload.trim() && !vpa.trim())}
          >
            {isAnalyzing ? 'Analyzing Threat Vectors...' : 'Analyze & Score Threat'}
          </button>
          <button type="button" className="btn-ghost" onClick={handleReset}>
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}

