'use strict';

const { Controller } = require('egg');

const REGISTER_RULES = {
  name: { type: 'string', required: true, trim: true },
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, min: 6 },
  role: { type: 'enum', values: ['patient', 'family', 'supporter'], required: false },
};

const LOGIN_RULES = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true },
};

class UserController extends Controller {
  /**
   * POST /api/v1/register
   * Register a new user account.
   */
  async register() {
    const { ctx } = this;
    ctx.validate(REGISTER_RULES, ctx.request.body);

    const result = await ctx.service.user.register(ctx.request.body);

    ctx.status = 201;
    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/login
   * Authenticate user and return a JWT token.
   */
  async login() {
    const { ctx } = this;
    ctx.validate(LOGIN_RULES, ctx.request.body);

    const result = await ctx.service.user.login(ctx.request.body);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/user/me
   * Get the authenticated user's own profile.
   * Requires auth middleware.
   */
  async me() {
    const { ctx } = this;
    const userId = ctx.state.user.id;

    const result = await ctx.service.user.getProfile(userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/users/:userId
   * Get a public user profile by ID.
   */
  async profile() {
    const { ctx } = this;
    const { userId } = ctx.params;

    const result = await ctx.service.user.getProfile(userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * PUT /api/v1/user/me
   * Update the authenticated user's profile.
   * Requires auth middleware.
   */
  async updateProfile() {
    const { ctx } = this;
    const userId = ctx.state.user.id;

    const result = await ctx.service.user.updateProfile(userId, ctx.request.body);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/users/:userId/follow
   * Toggle follow/unfollow on a user.
   * Requires auth middleware.
   */
  async follow() {
    const { ctx } = this;
    const followerId = ctx.state.user.id;
    const { userId } = ctx.params;

    const result = await ctx.service.user.follow(followerId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }
}

module.exports = UserController;
