import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeWebhook, timingSafeEqual } from '../api/webhook.js';

const SECRET = 'whsec_test_secret';

function sign(payload, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('accepts a correctly signed, fresh payload', () => {
  const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } });
  const header = sign(payload);
  const event = verifyStripeWebhook(Buffer.from(payload), header, SECRET);
  assert.equal(event.data.object.id, 'pi_1');
});

test('rejects a payload signed with the wrong secret', () => {
  const payload = JSON.stringify({ type: 'x' });
  const header = sign(payload, 'whsec_wrong_secret');
  assert.throws(() => verifyStripeWebhook(Buffer.from(payload), header, SECRET), /Signature mismatch/);
});

test('rejects a tampered payload (signature no longer matches)', () => {
  const original = JSON.stringify({ amount: 100 });
  const header = sign(original);
  const tampered = JSON.stringify({ amount: 999999 });
  assert.throws(() => verifyStripeWebhook(Buffer.from(tampered), header, SECRET), /Signature mismatch/);
});

test('rejects a stale timestamp outside the 5 minute tolerance', () => {
  const payload = JSON.stringify({ type: 'x' });
  const oldTimestamp = Math.floor(Date.now() / 1000) - 3600;
  const header = sign(payload, SECRET, oldTimestamp);
  assert.throws(() => verifyStripeWebhook(Buffer.from(payload), header, SECRET), /too old/);
});

test('rejects a missing signature header', () => {
  assert.throws(() => verifyStripeWebhook(Buffer.from('{}'), undefined, SECRET), /No stripe-signature header/);
});

test('rejects a malformed signature header', () => {
  assert.throws(() => verifyStripeWebhook(Buffer.from('{}'), 't=123', SECRET), /Malformed/);
});

test('timingSafeEqual compares equal and unequal buffers correctly', () => {
  assert.equal(timingSafeEqual(Buffer.from('abc'), Buffer.from('abc')), true);
  assert.equal(timingSafeEqual(Buffer.from('abc'), Buffer.from('abd')), false);
  assert.equal(timingSafeEqual(Buffer.from('abc'), Buffer.from('ab')), false);
});
