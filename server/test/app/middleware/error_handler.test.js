'use strict';

const assert = require('assert');

// Import the middleware factory directly for unit testing
const errorHandlerFactory = require('../../../app/middleware/error_handler');

function createMockCtx(overrides = {}) {
  return {
    status: 200,
    body: null,
    logger: {
      error: () => {},
    },
    ...overrides,
  };
}

describe('Error Handler Middleware', () => {
  let errorHandler;

  before(() => {
    errorHandler = errorHandlerFactory();
  });

  it('should pass through on successful request', async () => {
    const ctx = createMockCtx();
    await errorHandler(ctx, async () => {
      ctx.body = { code: 0, msg: 'ok' };
    });
    assert.deepStrictEqual(ctx.body, { code: 0, msg: 'ok' });
  });

  it('should handle 400 errors with code 1001', async () => {
    const ctx = createMockCtx();
    const err = new Error('Bad request');
    err.status = 400;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 400);
    assert.strictEqual(ctx.body.code, 1001);
    assert.strictEqual(ctx.body.data, null);
    assert.strictEqual(ctx.body.message, 'Bad request');
  });

  it('should handle 401 errors with code 1002', async () => {
    const ctx = createMockCtx();
    const err = new Error('Unauthorized');
    err.status = 401;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 401);
    assert.strictEqual(ctx.body.code, 1002);
  });

  it('should handle 403 errors with code 1002', async () => {
    const ctx = createMockCtx();
    const err = new Error('Forbidden');
    err.status = 403;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 403);
    assert.strictEqual(ctx.body.code, 1002);
  });

  it('should handle 404 errors with code 1003', async () => {
    const ctx = createMockCtx();
    const err = new Error('Not found');
    err.status = 404;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 404);
    assert.strictEqual(ctx.body.code, 1003);
  });

  it('should handle 409 errors with code 1001', async () => {
    const ctx = createMockCtx();
    const err = new Error('Conflict');
    err.status = 409;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 409);
    assert.strictEqual(ctx.body.code, 1001);
  });

  it('should handle 422 validation errors with formatted message', async () => {
    const ctx = createMockCtx();
    const err = new Error('Validation Failed');
    err.status = 422;
    err.errors = [
      { field: 'email', message: 'required' },
      { field: 'name', message: 'too short' },
    ];

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 422);
    assert.strictEqual(ctx.body.code, 1001);
    assert.strictEqual(ctx.body.message, 'email: required; name: too short');
  });

  it('should handle 500 errors with code 2001 and generic message', async () => {
    const ctx = createMockCtx();
    const err = new Error('Database connection lost');
    err.status = 500;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body.code, 2001);
    assert.strictEqual(ctx.body.message, '服务器内部错误，请稍后再试');
  });

  it('should default to 500 when error has no status', async () => {
    const ctx = createMockCtx();
    const err = new Error('Something went wrong');

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body.code, 2001);
    assert.strictEqual(ctx.body.message, '服务器内部错误，请稍后再试');
  });

  it('should log server errors (status >= 500)', async () => {
    let logged = false;
    const ctx = createMockCtx({
      logger: {
        error: () => { logged = true; },
      },
    });
    const err = new Error('DB crash');
    err.status = 500;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(logged, true);
  });

  it('should not log client errors (status < 500)', async () => {
    let logged = false;
    const ctx = createMockCtx({
      logger: {
        error: () => { logged = true; },
      },
    });
    const err = new Error('Bad request');
    err.status = 400;

    await errorHandler(ctx, async () => { throw err; });

    assert.strictEqual(logged, false);
  });
});
