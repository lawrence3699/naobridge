'use strict';

/**
 * User status check middleware.
 * Must be used after auth middleware (requires ctx.state.user).
 * Blocks banned users and enforces active mutes.
 * Auto-unmutes users whose muteExpiry has passed.
 */
module.exports = () => {
  return async function checkStatus(ctx, next) {
    const userId = ctx.state.user && ctx.state.user.id;

    if (!userId) {
      ctx.throw(401, 'Authentication required');
    }

    const user = await ctx.model.User.findByPk(userId);

    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    if (user.status === 'banned') {
      ctx.throw(403, 'Your account has been banned');
    }

    if (user.status === 'muted') {
      const now = new Date();
      const expiry = user.muteExpiry ? new Date(user.muteExpiry) : null;

      if (expiry && expiry <= now) {
        // Mute has expired — auto-unmute by creating updated record
        await ctx.model.User.update(
          { status: 'normal', muteExpiry: null },
          { where: { id: userId } }
        );
      } else {
        ctx.throw(403, 'Your account is currently muted');
      }
    }

    await next();
  };
};
