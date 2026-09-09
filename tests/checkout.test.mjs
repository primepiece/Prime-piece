import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/checkout.js';

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
    end() { return this; },
  };
  return res;
}

// Captures the last outgoing Stripe request so tests can assert on the
// server-computed amount/metadata rather than trusting the client's numbers.
function mockStripeFetch(responseBody) {
  let lastCall;
  globalThis.fetch = async (url, opts) => {
    lastCall = { url, opts };
    return { json: async () => responseBody };
  };
  return () => lastCall;
}

test('rejects non-POST requests', async () => {
  const res = fakeRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
});

test('rejects a request missing customer details', async () => {
  const res = fakeRes();
  await handler({ method: 'POST', body: { items: [{ id: 'table-blue-slate' }], customer: {} } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects an unknown product id instead of trusting the client', async () => {
  mockStripeFetch({ client_secret: 'cs_test', });
  const res = fakeRes();
  await handler({
    method: 'POST',
    body: {
      items: [{ id: 'not-a-real-product', price: 1 }],
      customer: { name: 'Jane', email: 'jane@example.com' },
    },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Unknown product/);
});

test('prices strictly from the server catalogue, ignoring a spoofed client price', async () => {
  const getLastCall = mockStripeFetch({ client_secret: 'cs_test', id: 'pi_test' });
  const res = fakeRes();
  // table-blue-slate is $270 in the catalogue — the client tries to pay $1.
  await handler({
    method: 'POST',
    body: {
      items: [{ id: 'table-blue-slate', price: 1 }],
      customer: { name: 'Jane', email: 'jane@example.com' },
    },
  }, res);

  assert.equal(res.statusCode, 200);
  const sentBody = new URLSearchParams(getLastCall().opts.body);
  assert.equal(sentBody.get('amount'), '27000'); // 270.00 NZD in cents
  assert.equal(res.body.amount, 270);
});

test('applies a valid server-side promo code and rejects an unknown one', async () => {
  const getLastCall = mockStripeFetch({ client_secret: 'cs_test' });

  const resValid = fakeRes();
  await handler({
    method: 'POST',
    body: {
      items: [{ id: 'table-blue-slate' }],
      customer: { name: 'Jane', email: 'jane@example.com' },
      promoCode: 'prime10',
    },
  }, resValid);
  let sentBody = new URLSearchParams(getLastCall().opts.body);
  assert.equal(sentBody.get('amount'), '24300'); // 270 * 0.9 = 243.00

  const resInvalid = fakeRes();
  await handler({
    method: 'POST',
    body: {
      items: [{ id: 'table-blue-slate' }],
      customer: { name: 'Jane', email: 'jane@example.com' },
      promoCode: 'NOT-A-CODE',
    },
  }, resInvalid);
  sentBody = new URLSearchParams(getLastCall().opts.body);
  assert.equal(sentBody.get('amount'), '27000'); // no discount applied
});
