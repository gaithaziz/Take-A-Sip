import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const fixturePath = __ENV.LOAD_FIXTURE || 'checkout-users.json';
const fixture = JSON.parse(open(fixturePath));
const users = new SharedArray('checkout users', () => fixture.users);

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');
const runId = __ENV.RUN_ID || '';
const targetVus = Number(__ENV.TARGET_VUS || fixture.target_vus || 150);
const warmupDuration = __ENV.WARMUP_DURATION || '5m';
const warmupVus = Number(__ENV.WARMUP_VUS || 1);
const rampDuration = __ENV.RAMP_DURATION || '2m';
const holdDuration = __ENV.HOLD_DURATION || '10m';
const rampDownDuration = __ENV.RAMP_DOWN_DURATION || '1m';

if (!baseUrl) {
  throw new Error('BASE_URL is required');
}
if (!runId) {
  throw new Error('RUN_ID is required');
}
if (users.length < targetVus) {
  throw new Error(`Fixture has ${users.length} users but TARGET_VUS is ${targetVus}`);
}

export const measuredHttpReqDuration = new Trend('measured_http_req_duration', true);
export const measuredHttpReqFailed = new Rate('measured_http_req_failed');
export const orderCreateDuration = new Trend('order_create_duration', true);
export const activeOrderConflicts = new Counter('active_order_conflicts');
export const capacityOrRateLimit429 = new Counter('capacity_or_rate_limit_429');

export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: warmupVus,
      duration: warmupDuration,
      exec: 'warmup',
      gracefulStop: '30s',
    },
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: rampDuration, target: targetVus },
        { duration: holdDuration, target: targetVus },
        { duration: rampDownDuration, target: 0 },
      ],
      startTime: warmupDuration,
      exec: 'checkoutRush',
      gracefulRampDown: '30s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    measured_http_req_failed: ['rate<0.01'],
    measured_http_req_duration: ['p(95)<1500'],
    order_create_duration: ['p(95)<1500'],
    active_order_conflicts: ['count==0'],
    capacity_or_rate_limit_429: ['count==0'],
  },
};

let checkoutAttempted = false;

function jsonHeaders(token, tagName) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return {
    headers,
    tags: { name: tagName },
    timeout: '30s',
  };
}

function recordMeasuredResponse(response, name) {
  measuredHttpReqDuration.add(response.timings.duration, { name });
  const failed = response.status < 200 || response.status >= 400;
  measuredHttpReqFailed.add(failed, { name });
  if (response.status === 429) {
    capacityOrRateLimit429.add(1, { name });
  }
  check(response, {
    [`${name} status < 400`]: (res) => res.status >= 200 && res.status < 400,
  });
}

function sleepWithJitter(baseSeconds = 1) {
  sleep(baseSeconds + Math.random());
}

function orderPayloadFor(user, vuId) {
  const payload = JSON.parse(JSON.stringify(user.order_payload));
  const marker = `load-test:${runId}`;
  const context = [`vu:${vuId}`];
  if (user.phone_number) {
    context.push(`phone:${user.phone_number}`);
  }
  payload.notes = `${marker} ${context.join(' ')}`;
  return payload;
}

export function warmup() {
  http.get(`${baseUrl}/health`, { tags: { name: 'GET /health warmup' }, timeout: '30s' });
  http.get(`${baseUrl}/ready`, { tags: { name: 'GET /ready warmup' }, timeout: '30s' });
  http.get(`${baseUrl}/menu`, { tags: { name: 'GET /menu warmup' }, timeout: '30s' });
  http.get(`${baseUrl}/promotions/active`, { tags: { name: 'GET /promotions/active warmup' }, timeout: '30s' });
  sleep(5);
}

export function checkoutRush() {
  if (checkoutAttempted) {
    sleep(10);
    return;
  }
  checkoutAttempted = true;

  const userIndex = (exec.vu.idInTest - 1) % users.length;
  const user = users[userIndex];
  const token = user.token;

  const menuRes = http.get(`${baseUrl}/menu`, jsonHeaders(null, 'GET /menu'));
  recordMeasuredResponse(menuRes, 'GET /menu');
  sleepWithJitter(1);

  const promosRes = http.get(`${baseUrl}/promotions/active`, jsonHeaders(null, 'GET /promotions/active'));
  recordMeasuredResponse(promosRes, 'GET /promotions/active');
  sleepWithJitter(1);

  if (user.delivery_quote_payload) {
    const quoteRes = http.post(
      `${baseUrl}/orders/delivery-quote`,
      JSON.stringify(user.delivery_quote_payload),
      jsonHeaders(token, 'POST /orders/delivery-quote')
    );
    recordMeasuredResponse(quoteRes, 'POST /orders/delivery-quote');
    sleepWithJitter(1);
  }

  const evaluateRes = http.post(
    `${baseUrl}/promotions/evaluate`,
    JSON.stringify(user.promotion_payload),
    jsonHeaders(token, 'POST /promotions/evaluate')
  );
  recordMeasuredResponse(evaluateRes, 'POST /promotions/evaluate');
  sleepWithJitter(1);

  const orderRes = http.post(
    `${baseUrl}/orders`,
    JSON.stringify(orderPayloadFor(user, exec.vu.idInTest)),
    jsonHeaders(token, 'POST /orders')
  );
  recordMeasuredResponse(orderRes, 'POST /orders');
  orderCreateDuration.add(orderRes.timings.duration, { name: 'POST /orders' });
  if (orderRes.status === 409) {
    activeOrderConflicts.add(1);
  }
  check(orderRes, {
    'POST /orders returned 201': (res) => res.status === 201,
  });

  sleep(10);
}
