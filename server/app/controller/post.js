'use strict';

const { Controller } = require('egg');

const CREATE_RULES = {
  title: { type: 'string', required: true, trim: true },
  content: { type: 'string', required: true, trim: true },
  category: {
    type: 'enum',
    values: ['recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'],
    required: false,
  },
  channelId: { type: 'number', required: false },
  images: { type: 'array', required: false, itemType: 'string' },
};

const UPDATE_RULES = {
  title: { type: 'string', required: false, trim: true },
  content: { type: 'string', required: false, trim: true },
  category: {
    type: 'enum',
    values: ['recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'],
    required: false,
  },
  commentEnabled: { type: 'boolean', required: false },
};

const REPORT_RULES = {
  reason: {
    type: 'enum',
    values: ['medical-fraud', 'ad-spam', 'harassment', 'violence', 'other'],
    required: true,
  },
  description: { type: 'string', required: false },
};

class PostController extends Controller {
  /**
   * POST /api/v1/posts
   * Create a new post.
   * Requires auth + checkStatus middleware.
   */
  async create() {
    const { ctx } = this;
    ctx.validate(CREATE_RULES, ctx.request.body);

    const userId = ctx.state.user.id;
    const result = await ctx.service.post.create({
      ...ctx.request.body,
      userId,
    });

    ctx.status = 201;
    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/posts
   * List posts with optional category filter and pagination.
   * Public endpoint.
   */
  async list() {
    const { ctx } = this;
    const { category, page, page_size } = ctx.query;

    const result = await ctx.service.post.list({
      category,
      page: Number(page) || 1,
      pageSize: Number(page_size) || 20,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/posts/feed
   * Get personalized feed for authenticated user.
   * Requires auth middleware.
   */
  async feed() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { page, page_size } = ctx.query;

    const result = await ctx.service.post.feed({
      userId,
      page: Number(page) || 1,
      pageSize: Number(page_size) || 20,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/posts/:postId
   * Show a single post by ID.
   * Public endpoint.
   */
  async show() {
    const { ctx } = this;
    const { postId } = ctx.params;

    const result = await ctx.service.post.show(postId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * PUT /api/v1/posts/:postId
   * Update an existing post.
   * Requires auth + checkStatus middleware.
   */
  async update() {
    const { ctx } = this;
    ctx.validate(UPDATE_RULES, ctx.request.body);

    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.post.update(postId, userId, ctx.request.body);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * DELETE /api/v1/posts/:postId
   * Delete a post.
   * Requires auth middleware.
   */
  async destroy() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.post.destroy(postId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/posts/:postId/like
   * Toggle like on a post.
   * Requires auth middleware.
   */
  async like() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.post.like(postId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/posts/:postId/report
   * Report a post.
   * Requires auth middleware.
   */
  async report() {
    const { ctx } = this;
    ctx.validate(REPORT_RULES, ctx.request.body);

    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.report.create({
      userId,
      targetType: 'post',
      targetId: postId,
      ...ctx.request.body,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/posts/:postId/favorite
   * Toggle favorite on a post.
   * Requires auth middleware.
   */
  async favorite() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.post.favorite(postId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }
}

module.exports = PostController;
