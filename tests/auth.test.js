const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

async function requestJson(appInstance, path, options = {}) {
  const server = appInstance.listen(0, async () => {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(options.body && options.headers && options.headers['Content-Type'] ? {} : {})
      }
    });

    const body = await response.text();
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      json = body;
    }

    server.close();
    return { status: response.status, headers: response.headers, body: json };
  });

  return new Promise((resolve, reject) => {
    appInstance.once('error', reject);
    server.on('close', () => resolve(requestJson(appInstance, path, options)));
  });
}

test('login succeeds with correct code and sets session cookie', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: '020818' })
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.match(response.headers.get('set-cookie') || '', /ehoser_session=/);

  server.close();
});

test('session endpoint rejects unauthenticated request', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/api/session`);
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.authenticated, false);

  server.close();
});
