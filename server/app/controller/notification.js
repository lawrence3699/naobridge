'use strict';

const { Controller } = require('egg');

class NotificationController extends Controller {
  /**
   * GET /api/v1/notifications
   * List paginated notifications for the authenticated user.
   * Requires auth middleware.
   */
  async list() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { page, page_size } = ctx.query;

    const result = await ctx.service.notification.list(userId, {
      page: Number(page) || 1,
      pageSize: Number(page_size) || 20,
    });

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * PUT /api/v1/notifications/:notificationId/read
   * Mark a single notification as read.
   * Requires auth middleware.
   */
  async markRead() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { notificationId } = ctx.params;

    const result = await ctx.service.notification.markRead(notificationId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * PUT /api/v1/notifications/read-all
   * Mark all notifications as read for the authenticated user.
   * Requires auth middleware.
   */
  async markAllRead() {
    const { ctx } = this;
    const userId = ctx.state.user.id;

    const result = await ctx.service.notification.markAllRead(userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get the count of unread notifications.
   * Requires auth middleware.
   */
  async unreadCount() {
    const { ctx } = this;
    const userId = ctx.state.user.id;

    const result = await ctx.service.notification.unreadCount(userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }
}

module.exports = NotificationController;
