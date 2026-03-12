'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and sets ctx.state.user to the decoded payload.
 */
module.exports = () => {
  return async function auth(ctx, next) {
    const authorization = ctx.get('authorization');

    if (!authorization) {
      ctx.throw(401, 'Authentication required: no token provided');
    }

    const parts = authorization.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      ctx.throw(401, 'Authentication required: invalid token format');
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, ctx.app.config.jwt.secret);
      ctx.state.user = decoded;
    } catch (err) {
      ctx.throw(401, 'Authentication required: token is invalid or expired');
    }

    await next();
  };
};
