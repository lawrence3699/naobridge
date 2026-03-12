'use strict';

const assert = require('assert');

const checkStatusFactory = require('../../../app/middleware/check_status');

function createMockCtx({ userId, userData } = {}) {
  return {
    state: {
      user: userId ? { id: userId } : null,
    },
    model: {
      User: {
        findByPk: async () => userData || null,
        update: async () => [1],
      },
    },
    throw(status, message) {
      const err = new Error(message);
      err.status = status;
      throw err;
    },
  };
}

describe('CheckStatus Middleware', () => {
  let checkStatus;

  before(() => {
    checkStatus = checkStatusFactory();
  });

  it('should pass for normal user', async () => {
    const ctx = createMockCtx({
      userId: 1,
      userData: { id: 1, status: 'normal', muteExpiry: null },
    });
    let nextCalled = false;

    await checkStatus(ctx, async () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  it('should throw 401 when no user in state', async () => {
    const ctx = createMockCtx();

    await assert.rejects(
      () => checkStatus(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 401);
        return true;
      }
    );
  });

  it('should throw 404 when user not found in DB', async () => {
    const ctx = createMockCtx({ userId: 999, userData: null });

    await assert.rejects(
      () => checkStatus(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 404);
        return true;
      }
    );
  });

  it('should throw 403 for banned user', async () => {
    const ctx = createMockCtx({
      userId: 1,
      userData: { id: 1, status: 'banned', muteExpiry: null },
    });

    await assert.rejects(
      () => checkStatus(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 403);
        assert(err.message.includes('banned'));
        return true;
      }
    );
  });

  it('should throw 403 for actively muted user', async () => {
    const futureDate = new Date(Date.now() + 86400000); // 1 day from now
    const ctx = createMockCtx({
      userId: 1,
      userData: { id: 1, status: 'muted', muteExpiry: futureDate },
    });

    await assert.rejects(
      () => checkStatus(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 403);
        assert(err.message.includes('muted'));
        return true;
      }
    );
  });

  it('should auto-unmute when mute has expired', async () => {
    const pastDate = new Date(Date.now() - 86400000); // 1 day ago
    let updateCalled = false;

    const ctx = createMockCtx({
      userId: 1,
      userData: { id: 1, status: 'muted', muteExpiry: pastDate },
    });
    ctx.model.User.update = async (fields, options) => {
      updateCalled = true;
      assert.strictEqual(fields.status, 'normal');
      assert.strictEqual(fields.muteExpiry, null);
      assert.strictEqual(options.where.id, 1);
      return [1];
    };

    let nextCalled = false;
    await checkStatus(ctx, async () => { nextCalled = true; });

    assert.strictEqual(updateCalled, true);
    assert.strictEqual(nextCalled, true);
  });

  it('should throw 403 for permanently muted user (no expiry)', async () => {
    const ctx = createMockCtx({
      userId: 1,
      userData: { id: 1, status: 'muted', muteExpiry: null },
    });

    await assert.rejects(
      () => checkStatus(ctx, async () => {}),
      err => {
        assert.strictEqual(err.status, 403);
        assert(err.message.includes('muted'));
        return true;
      }
    );
  });
});
