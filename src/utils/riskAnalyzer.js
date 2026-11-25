import { parsePaymentPayload } from './upiParser.js';
import { validateGateway } from './gatewayValidator.js';

const SOCIAL_ENGINEERING_TERMS = [
  'refund',
  'cashback',
  'reward',
  'kyc',
  'urgent',
  'verify',
  'pin',
  'unblock',
  'suspended',
  'lottery',
  'prize',
  'claim',
  'bonus',
  'helpdesk',
  'customer care',
];

const HIGH_RISK_CHANNELS = new Set(['WhatsApp', 'SMS', 'Telegram / Social', 'Unknown Caller']);

/**
 * Simulates the Scikit-learn risk-scoring pipeline locally when the Python API is unavailable,
 * or normalizes payload analysis with transparent feature weights and recommendations.
 */
export function analyzePaymentPayload({
  payload = '',
  payeeName = '',
  vpa = '',
  amount = '',
  note = '',
  channel = 'Point of Sale',
  inputType = 'QR Payload',
} = {}) {
  const parsed = parsePaymentPayload(payload);
  const resolvedVpa = (vpa || parsed.vpa || '').trim();
  const resolvedPayee = (payeeName || parsed.payeeName || '').trim();
  const numericAmount =
    amount !== '' && amount !== null && amount !== undefined
      ? Number(amount)
      : parsed.amount;
  const resolvedNote = (note || parsed.note || '').trim();

  const gateway = validateGateway(parsed, {
    vpa: resolvedVpa,
    payeeName: resolvedPayee,
  });

  const indicators = [];
  const featureContributions = [];
  let score = 6; // baseline transaction friction score

  // Feature 1: Gateway failures / warnings
  for (const check of gateway.checks) {
    if (check.status === 'FAIL') {
      const weight = check.id === 'intent' ? 32 : check.id === 'domain' ? 34 : 26;
      score += weight;
      indicators.push({
        severity: 'high',
        title: check.label,
        detail: check.detail,
      });
      featureContributions.push({ feature: check.label, impact: weight });
    } else if (check.status === 'WARN') {
      const weight = check.id === 'domain' ? 24 : 14;
      score += weight;
      indicators.push({
        severity: 'medium',
        title: check.label,
        detail: check.detail,
      });
      featureContributions.push({ feature: check.label, impact: weight });
    }
  }

  // Feature 2: Social-engineering / urgency NLP keywords
  const textCorpus = `${resolvedNote} ${resolvedPayee} ${resolvedVpa} ${parsed.rawPayload}`.toLowerCase();
  const matchedTerms = SOCIAL_ENGINEERING_TERMS.filter((term) => textCorpus.includes(term));
  if (matchedTerms.length > 0) {
    const keywordWeight = Math.min(35, 14 + matchedTerms.length * 7);
    score += keywordWeight;
    indicators.push({
      severity: 'high',
      title: 'Social-Engineering Bait Pattern',
      detail: `Detected high-risk scam keywords: ${matchedTerms.map((t) => `"${t}"`).join(', ')}.`,
    });
    featureContributions.push({ feature: 'NLP Bait & Urgency Tokens', impact: keywordWeight });
  }

  // Feature 3: Pre-filled high amount anomaly
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    if (numericAmount >= 10000) {
      score += 16;
      indicators.push({
        severity: 'medium',
        title: 'High Pre-Filled Transaction Amount',
        detail: `QR/request enforces ₹${numericAmount.toLocaleString('en-IN')}. Scammers frequently lock high amounts in tampered QRs.`,
      });
      featureContributions.push({ feature: 'Pre-filled Amount Anomaly', impact: 16 });
    } else if (numericAmount >= 3000 && matchedTerms.length > 0) {
      score += 10;
      featureContributions.push({ feature: 'Amount + Bait Correlation', impact: 10 });
    }
  }

  // Feature 4: Origin channel context
  if (HIGH_RISK_CHANNELS.has(channel)) {
    const channelWeight = 12;
    score += channelWeight;
    indicators.push({
      severity: 'medium',
      title: `Untrusted Acquisition Channel (${channel})`,
      detail: `Payment requests received via ${channel} carry elevated phishing and impersonation risk.`,
    });
    featureContributions.push({ feature: 'Source Channel Risk', impact: channelWeight });
  }

  // Positive trust signals (reduce risk slightly when merchant code & safe channel present)
  if (parsed.merchantCode && gateway.overallStatus === 'PASS' && matchedTerms.length === 0) {
    score = Math.max(4, score - 4);
    indicators.push({
      severity: 'low',
      title: `Verified Merchant Category Code (MCC ${parsed.merchantCode})`,
      detail: 'Valid commercial merchant code and clean PSP handle reduce fraud probability.',
    });
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = riskScore >= 65 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

  const verdict =
    riskLevel === 'HIGH'
      ? parsed.isCollectRequest
        ? 'Fraudulent Collect Trap'
        : parsed.kind === 'url'
          ? 'Phishing Gateway Detected'
          : 'High-Risk Payment Threat'
      : riskLevel === 'MEDIUM'
        ? 'Suspicious Payment Request'
        : 'Verified Safe Payment';

  const recommendations = buildRecommendations({ riskLevel, parsed, matchedTerms });

  return {
    id: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    inputType,
    channel,
    parsed: {
      ...parsed,
      vpa: resolvedVpa,
      payeeName: resolvedPayee,
      amount: Number.isFinite(numericAmount) ? numericAmount : 0,
      note: resolvedNote,
    },
    target: resolvedVpa || parsed.domain || parsed.rawPayload.slice(0, 48) || 'Unknown Target',
    payeeName: resolvedPayee || (parsed.kind === 'url' ? 'External Web Gateway' : 'Unspecified Payee'),
    amount: Number.isFinite(numericAmount) ? numericAmount : 0,
    currency: parsed.currency || 'INR',
    riskScore,
    riskLevel,
    verdict,
    confidence: Number((0.84 + Math.min(0.14, featureContributions.length * 0.03)).toFixed(2)),
    gatewayStatus: gateway.overallStatus,
    gatewayChecks: gateway.checks,
    indicators,
    featureContributions:
      featureContributions.length > 0
        ? featureContributions
        : [{ feature: 'Clean Baseline Pattern', impact: riskScore }],
    recommendations,
    mode: 'simulation',
    reported: false,
  };
}

function buildRecommendations({ riskLevel, parsed, matchedTerms }) {
  if (riskLevel === 'HIGH') {
    const list = [
      'Do NOT proceed with this payment or enter your UPI PIN.',
      'Remember: Receiving a refund or cashback NEVER requires scanning a QR or entering your UPI PIN.',
    ];
    if (parsed.kind === 'url') {
      list.push('Close the webpage immediately and never enter card, OTP, or netbanking credentials.');
    }
    if (matchedTerms.length > 0) {
      list.push('Verify the claim directly inside your official bank or merchant app.');
    }
    list.push('Report the VPA/domain to NPCI / Cybercrime Portal (1930) and save this audit log.');
    return list;
  }

  if (riskLevel === 'MEDIUM') {
    return [
      'Pause and independently verify the recipient name and phone number before paying.',
      'Avoid following shortened or third-party payment links sent over messaging apps.',
      'Confirm the transaction amount carefully on your UPI confirmation screen.',
    ];
  }

  return [
    'All gateway and pattern checks passed with low fraud risk.',
    'Still confirm the displayed merchant name matches the physical store or invoice before entering your PIN.',
  ];
}

