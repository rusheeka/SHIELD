import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentPayload } from '../src/utils/upiParser.js';
import { validateGateway } from '../src/utils/gatewayValidator.js';
import { analyzePaymentPayload } from '../src/utils/riskAnalyzer.js';

test('parsePaymentPayload extracts fields from a standard UPI pay URI', () => {
  const parsed = parsePaymentPayload(
    'upi://pay?pa=aromacafe.store@okicici&pn=Aroma%20Coffee&am=240.00&cu=INR&tn=Order%2048&mc=5812',
  );
  assert.equal(parsed.kind, 'upi');
  assert.equal(parsed.vpa, 'aromacafe.store@okicici');
  assert.equal(parsed.vpaHandle, 'okicici');
  assert.equal(parsed.payeeName, 'Aroma Coffee');
  assert.equal(parsed.amount, 240);
  assert.equal(parsed.merchantCode, '5812');
  assert.equal(parsed.isCollectRequest, false);
});

test('parsePaymentPayload flags upi://collect requests', () => {
  const parsed = parsePaymentPayload(
    'upi://collect?pa=claim.reward99@ybl&pn=Cashback%20Helpdesk&am=4999',
  );
  assert.equal(parsed.kind, 'upi');
  assert.equal(parsed.isCollectRequest, true);
});

test('validateGateway flags insecure HTTP and brand typosquatting domains', () => {
  const parsed = parsePaymentPayload('http://paytm-kyc-update-verify.xyz/login');
  const gateway = validateGateway(parsed);
  assert.equal(gateway.overallStatus, 'FAIL');
  assert.ok(gateway.checks.some((c) => c.id === 'tls' && c.status === 'FAIL'));
  assert.ok(gateway.checks.some((c) => c.id === 'domain' && c.status === 'FAIL'));
});

test('analyzePaymentPayload classifies verified merchant POS QR as LOW risk', () => {
  const result = analyzePaymentPayload({
    payload:
      'upi://pay?pa=aromacafe.store@okicici&pn=Aroma%20Specialty%20Coffee&am=240.00&cu=INR&tn=Order%204819&mc=5812',
    channel: 'Point of Sale',
  });
  assert.equal(result.riskLevel, 'LOW');
  assert.equal(result.gatewayStatus, 'PASS');
  assert.ok(result.riskScore < 30);
});

test('analyzePaymentPayload classifies WhatsApp fake refund collect trap as HIGH risk', () => {
  const result = analyzePaymentPayload({
    payload:
      'upi://collect?pa=claim.reward99@ybl&pn=UPI%20Cashback%20Helpdesk&am=4999.00&cu=INR&tn=Urgent%20Refund%20Claim%20Verify%20PIN',
    channel: 'WhatsApp',
  });
  assert.equal(result.riskLevel, 'HIGH');
  assert.equal(result.gatewayStatus, 'FAIL');
  assert.ok(result.riskScore >= 65);
  assert.ok(result.indicators.length >= 2);
});

