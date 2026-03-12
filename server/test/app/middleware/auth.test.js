'use strict';

const assert = require('assert');
const jwt = require('jsonwebtoken');

const authFactory = require('../../../app/middleware/auth');

const TEST_SECRET = 'test-secret-key';

function createMockCtx(headers = {}) {
  const ctx = {
    headers: {},
    state: {},
    app: {
      config: {
        jwt: { secret: TEST_SECRET },
      },
    },
    get(name) {
      return this.headers[name.toLowerCase()] || '';
    },
    throw(status, message) {
      const err = new Error(message);
      err.status = status;
      throw err;
    },
  };
  for (const [k, v] of Object.entries(headers)) {
    ctx.headers[k.toLowerCase()] = v;
  }
  return ctx;
}

describe('Auth Middleware', () => {
  let auth;
  const payload = { id: 1, name: 'test', role: 'patient', status: 'normal' };

  before(() => {
    auth = authFactory();
  });

  it('should decode valid token and set ctx.state.user', async () => {
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
    const ctx = createMockCtx({ authorization: `Bearer ${token}` });
    let nextCalled = false;

    await auth(ctx, async () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(ctx.state.user.id, 1);
    assert.strictEqual(ctx.state.user.name, 'test');
    assert.strictEqual(ctx.state.user.role, 'patient');
  });

  it('should throw 401 when no authorization header', async () => {
    const ctx = createMockCtx();

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        assert(err.message.includes('no token provided'));
        return true;
      }
    );
  });

  it('should throw 401 for invalid format (no Bearer prefix)', async () => {
    const token = jwt.sign(payload, TEST_SECRET);
    const ctx = createMockCtx({ authorization: token });

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        assert(err.message.includes('invalid token format'));
        return true;
      }
    );
  });

  it('should throw 401 for invalid format (wrong prefix)', async () => {
    const token = jwt.sign(payload, TEST_SECRET);
    const ctx = createMockCtx({ authorization: `Token ${token}` });

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        assert(err.message.includes('invalid token format'));
        return true;
      }
    );
  });

  it('should throw 401 for expired token', async () => {
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1s' });
    const ctx = createMockCtx({ authorization: `Bearer ${token}` });

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        assert(err.message.includes('invalid or expired'));
        return true;
      }
    );
  });

  it('should throw 401 for token signed with wrong secret', async () => {
    const token = jwt.sign(payload, 'wrong-secret');
    const ctx = createMockCtx({ authorization: `Bearer ${token}` });

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        assert(err.message.includes('invalid or expired'));
        return true;
      }
    );
  });

  it('should throw 401 for malformed token', async () => {
    const ctx = createMockCtx({ authorization: 'Bearer not.a.valid.token' });

    await assert.rejects(
      () => auth(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        return true;
      }
    );
  });
});
