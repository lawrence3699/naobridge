'use strict';

const { Service } = require('egg');

const VALID_TYPES = ['comment', 'reply', 'system', 'report-result'];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

class NotificationService extends Service {

  /**
   * Create a new notification
   * @param {object} params - { userId, type, title, content, relatedId }
   * @returns {object} created notification
   */
  async create({ userId, type, title, content, relatedId }) {
    const { ctx } = this;

    if (!userId) {
      ctx.throw(400, 'userId is required');
    }

    if (!type || !VALID_TYPES.includes(type)) {
      ctx.throw(400, `type must be one of: ${VALID_TYPES.join(', ')}`);
    }

    if (!title || !title.trim()) {
      ctx.throw(400, 'title is required');
    }

    if (!content || !content.trim()) {
      ctx.throw(400, 'content is required');
    }

    const notification = await ctx.model.Notification.create({
      userId,
      type,
      title: title.trim(),
      content: content.trim(),
      relatedId: relatedId || null,
      isRead: false,
    });

    return notification;
  }

  /**
   * List notifications for a user with pagination
   * @param {number} userId
   * @param {object} params - { page, pageSize }
   * @returns {{ rows: object[], count: number, page: number, pageSize: number }}
   */
  async list(userId, { page, pageSize } = {}) {
    const { ctx } = this;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (currentPage - 1) * limit;

    const { rows, count } = await ctx.model.Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      rows,
      count,
      page: currentPage,
      pageSize: limit,
    };
  }

  /**
   * Mark a single notification as read
   * @param {number} notificationId
   * @param {number} userId
   * @returns {object} updated notification
   */
  async markRead(notificationId, userId) {
    const { ctx } = this;

    const notification = await ctx.model.Notification.findByPk(notificationId);

    if (!notification) {
      ctx.throw(404, 'Notification not found');
    }

    if (notification.userId !== userId) {
      ctx.throw(403, 'You do not have permission to access this notification');
    }

    await ctx.model.Notification.update(
      { isRead: true },
      { where: { id: notificationId } }
    );

    return ctx.model.Notification.findByPk(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId
   * @returns {{ updated: number }}
   */
  async markAllRead(userId) {
    const { ctx } = this;

    const [updated] = await ctx.model.Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    return { updated };
  }

  /**
   * Get unread notification count for a user
   * @param {number} userId
   * @returns {{ count: number }}
   */
  async unreadCount(userId) {
    const { ctx } = this;

    const count = await ctx.model.Notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }
}

module.exports = NotificationService;
