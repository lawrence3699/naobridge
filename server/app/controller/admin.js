'use strict';

const { Controller } = require('egg');

const REVIEW_RULES = {
  status: { type: 'enum', values: ['PROCESSED', 'REFUSED'], required: true },
  result: { type: 'string', required: false },
};

const MUTE_RULES = {
  duration: { type: 'number', required: true, min: 1 },
};

const ADD_WORD_RULES = {
  word: { type: 'string', required: true, trim: true },
  category: {
    type: 'enum',
    values: ['ad', 'fraud', 'discrimination', 'medical-fraud', 'violence'],
    required: true,
  },
};

class AdminController extends Controller {
  /**
   * GET /api/v1/admin/stats
   * Get dashboard statistics.
   * Requires auth middleware + admin check.
   */
  async stats() {
    const { ctx } = this;
    await this._requireAdmin();

    const result = await ctx.service.admin.stats();

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/admin/reports/:reportId/review
   * Review and resolve a report.
   * Requires auth middleware + admin check.
   */
  async reviewReport() {
    const { ctx } = this;
    await this._requireAdmin();
    ctx.validate(REVIEW_RULES, ctx.request.body);

    const adminId = ctx.state.user.id;
    const { reportId } = ctx.params;

    const result = await ctx.service.admin.reviewReport({
      reportId,
      adminId,
      ...ctx.request.body,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/admin/users/:userId/mute
   * Mute a user for a specified duration (in hours).
   * Requires auth middleware + admin check.
   */
  async muteUser() {
    const { ctx } = this;
    await this._requireAdmin();
    ctx.validate(MUTE_RULES, ctx.request.body);

    const adminId = ctx.state.user.id;
    const { userId } = ctx.params;

    const result = await ctx.service.admin.muteUser({
      userId,
      adminId,
      duration: ctx.request.body.duration,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/admin/users/:userId/ban
   * Permanently ban a user.
   * Requires auth middleware + admin check.
   */
  async banUser() {
    const { ctx } = this;
    await this._requireAdmin();

    const adminId = ctx.state.user.id;
    const { userId } = ctx.params;

    const result = await ctx.service.admin.banUser({ userId, adminId });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/admin/users/:userId/unmute
   * Unmute a previously muted user.
   * Requires auth middleware + admin check.
   */
  async unmuteUser() {
    const { ctx } = this;
    await this._requireAdmin();

    const adminId = ctx.state.user.id;
    const { userId } = ctx.params;

    const result = await ctx.service.admin.unmuteUser({ userId, adminId });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/admin/words
   * Add a new sensitive word.
   * Requires auth middleware + admin check.
   */
  async addWord() {
    const { ctx } = this;
    await this._requireAdmin();
    ctx.validate(ADD_WORD_RULES, ctx.request.body);

    const result = await ctx.service.admin.addWord(ctx.request.body);

    ctx.status = 201;
    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * DELETE /api/v1/admin/words/:wordId
   * Remove a sensitive word.
   * Requires auth middleware + admin check.
   */
  async removeWord() {
    const { ctx } = this;
    await this._requireAdmin();

    const { wordId } = ctx.params;

    const result = await ctx.service.admin.removeWord(wordId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/admin/reports
   * List all reports with pagination.
   * Requires auth middleware + admin check.
   */
  async reportList() {
    const { ctx } = this;
    await this._requireAdmin();

    const { status, page, page_size } = ctx.query;

    const result = await ctx.service.admin.reportList({
      status,
      page: Number(page) || 1,
      pageSize: Number(page_size) || 20,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/admin/content
   * List content for moderation.
   * Requires auth middleware + admin check.
   */
  async contentList() {
    const { ctx } = this;
    await this._requireAdmin();

    const { type, status, page, page_size } = ctx.query;

    const result = await ctx.service.admin.contentList({
      type,
      status,
      page: Number(page) || 1,
      pageSize: Number(page_size) || 20,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * Verify that the current user has admin privileges.
   * Throws 403 if the user is not an admin.
   * @private
   */
  async _requireAdmin() {
    const { ctx } = this;
    const userId = ctx.state.user.id;

    const admin = await ctx.model.Admin.findOne({ where: { userId } });

    if (!admin) {
      ctx.throw(403, '权限不足，需要管理员权限');
    }
  }
}

module.exports = AdminController;
