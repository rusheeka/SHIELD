const TRUSTED_PSP_HANDLES = new Set([
  'okicici',
  'oksbi',
  'okaxis',
  'okhdfcbank',
  'ybl',
  'ibl',
  'axl',
  'paytm',
  'pthdfc',
  'ptsbi',
  'ptaxis',
  'ptyes',
  'upi',
  'apl',
  'icici',
  'sbi',
  'hdfcbank',
  'axisbank',
  'kotak',
  'barodampay',
  'indus',
]);

const OFFICIAL_PAYMENT_DOMAINS = [
  'razorpay.com',
  'paytm.com',
  'phonepe.com',
  'cashfree.com',
  'stripe.com',
  'paypal.com',
  'billdesk.com',
  'npci.org.in',
  'sbi.co.in',
  'hdfcbank.com',
  'icicibank.com',
];

const SHORTENER_DOMAINS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'rb.gy',
  'is.gd',
  'cutt.ly',
  'shorturl.at',
]);

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.tk', '.ml', '.ga', '.cf', '.buzz', '.icu', '.work'];

const BRAND_TOKENS = ['paytm', 'phonepe', 'gpay', 'googlepay', 'razorpay', 'npci', 'bhim', 'sbi', 'hdfc', 'icici', 'axis'];

function matchesOfficialDomain(domain) {
  return OFFICIAL_PAYMENT_DOMAINS.some(
    (official) => domain === official || domain.endsWith(`.${official}`),
  );
}

/**
 * Runs deterministic Secure Gateway Validation checks across UPI VPAs and web payment URLs.
 */
export function validateGateway(parsed, metadata = {}) {
  const checks = [];
  const effectiveVpa = (metadata.vpa || parsed.vpa || '').trim();
  const effectiveHandle = effectiveVpa.includes('@')
    ? effectiveVpa.split('@')[1].toLowerCase()
    : parsed.vpaHandle;
  const effectivePayee = (metadata.payeeName || parsed.payeeName || '').trim();

  // 1. Protocol & Transport Validation
  if (parsed.kind === 'url') {
    const isHttps = parsed.protocol === 'https';
    checks.push({
      id: 'tls',
      label: 'SSL / HTTPS Transport',
      status: isHttps ? 'PASS' : 'FAIL',
      detail: isHttps
        ? 'Encrypted HTTPS transport protocol verified.'
        : 'Insecure HTTP protocol detected; credentials and session tokens are exposed.',
    });

    // 2. Domain / Typosquatting Check
    const domain = parsed.domain;
    const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
    const isShortener = SHORTENER_DOMAINS.has(domain);
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
    const isOfficial = matchesOfficialDomain(domain);
    const impersonatesBrand =
      !isOfficial && BRAND_TOKENS.some((token) => domain.includes(token));

    if (isIpLiteral || impersonatesBrand || hasSuspiciousTld) {
      checks.push({
        id: 'domain',
        label: 'Gateway Domain Authenticity',
        status: 'FAIL',
        detail: isIpLiteral
          ? `Raw IP host (${domain}) used instead of verified merchant domain.`
          : impersonatesBrand
            ? `Domain "${domain}" contains a payment/bank brand token outside official domains (possible typosquatting).`
            : `High-risk TLD detected on "${domain}".`,
      });
    } else if (isShortener) {
      checks.push({
        id: 'domain',
        label: 'Gateway Domain Authenticity',
        status: 'WARN',
        detail: `URL shortener "${domain}" hides the final payment destination.`,
      });
    } else {
      checks.push({
        id: 'domain',
        label: 'Gateway Domain Authenticity',
        status: isOfficial ? 'PASS' : 'WARN',
        detail: isOfficial
          ? `Verified official gateway domain (${domain}).`
          : `Unlisted third-party domain (${domain}); verify merchant identity before paying.`,
      });
    }
  }

  // 3. UPI VPA & PSP Handle Validation
  if (effectiveVpa) {
    const validSyntax = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(effectiveVpa);
    const trustedHandle = TRUSTED_PSP_HANDLES.has(effectiveHandle);

    checks.push({
      id: 'vpa-syntax',
      label: 'VPA Handle & PSP Registry',
      status: validSyntax && trustedHandle ? 'PASS' : validSyntax ? 'WARN' : 'FAIL',
      detail: !validSyntax
        ? `Malformed UPI VPA "${effectiveVpa}".`
        : trustedHandle
          ? `Registered NPCI PSP handle "@${effectiveHandle}".`
          : `Unrecognized PSP handle "@${effectiveHandle}" outside standard bank list.`,
    });

    // Brand/Bank impersonation inside VPA prefix or Payee Name
    const vpaPrefix = effectiveVpa.split('@')[0].toLowerCase();
    const combinedIdentity = `${vpaPrefix} ${effectivePayee.toLowerCase()}`;
    const hasOfficialClaim =
      /\b(kyc|refund|cashback|reward|support|helpdesk|verify|unblock|claim|prize|lottery)\b/.test(
        combinedIdentity,
      ) ||
      (BRAND_TOKENS.some((b) => vpaPrefix.includes(b)) && !parsed.merchantCode);

    checks.push({
      id: 'identity-binding',
      label: 'Payee Identity Consistency',
      status: hasOfficialClaim ? 'FAIL' : effectivePayee ? 'PASS' : 'WARN',
      detail: hasOfficialClaim
        ? 'Payee name or VPA contains impersonation/bait keywords (e.g., refund, KYC, helpdesk) without verified merchant credentials.'
        : effectivePayee
          ? `Payee "${effectivePayee}" matches standard format.`
          : 'No payee display name provided in payload; confirm recipient manually.',
    });
  }

  // 4. UPI Collect vs Pay Intent Check
  if (parsed.kind === 'upi') {
    checks.push({
      id: 'intent',
      label: 'Transaction Intent Direction',
      status: parsed.isCollectRequest ? 'FAIL' : 'PASS',
      detail: parsed.isCollectRequest
        ? 'Collect/pull request detected (`upi://collect`). Approving this debits your account.'
        : 'Standard push-payment intent (`upi://pay`).',
    });
  }

  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARN');

  return {
    overallStatus: hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS',
    checks,
  };
}

