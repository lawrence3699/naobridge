'use strict';

const { Service } = require('egg');
const moment = require('moment');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

class AdminService extends Service {

  /**
   * Check if a user is an admin
   * @param {number} userId
   * @returns {boolean}
   */
  async isAdmin(userId) {
    const { ctx } = this;

    const admin = await ctx.model.Admin.findOne({
      where: { userId },
    });

    return !!admin;
  }

  /**
   * Verify admin status or throw 403
   * @param {number} userId
   * @private
   */
  async _requireAdmin(userId) {
    const isAdminUser = await this.isAdmin(userId);
    if (!isAdminUser) {
      this.ctx.throw(403, 'Admin access required');
    }
  }

  /**
   * Get platform statistics
   * @param {number} adminId - requesting admin's userId
   * @returns {{ users: number, posts: number, comments: number, pendingReports: number }}
   */
  async getStats(adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const [users, posts, comments, pendingReports] = await Promise.all([
      ctx.model.User.count(),
      ctx.model.Post.count({ where: { is_valid: true } }),
      ctx.model.PostComment.count(),
      ctx.model.PostFeedback.count({ where: { status: 'PENDING' } }),
    ]);

    return { users, posts, comments, pendingReports };
  }

  /**
   * Review a report: delete target content or dismiss
   * @param {number} reportId
   * @param {string} action - 'delete' or 'dismiss'
   * @param {string} resultNote - optional note about the decision
   * @param {number} adminId - requesting admin's userId
   * @returns {object} updated report
   */
  async reviewReport(reportId, action, resultNote, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const report = await ctx.model.PostFeedback.findByPk(reportId);
    if (!report) {
      ctx.throw(404, 'Report not found');
    }

    if (report.status !== 'PENDING') {
      ctx.throw(400, 'Report has already been processed');
    }

    if (action === 'delete') {
      // Hide the target content based on targetType
      await this._hideTarget(report.targetType, report.targetId);

      await ctx.model.PostFeedback.update(
        {
          status: 'PROCESSED',
          handlerId: adminId,
          result: resultNote || 'Content removed by admin',
        },
        { where: { id: reportId } }
      );
    } else if (action === 'dismiss') {
      await ctx.model.PostFeedback.update(
        {
          status: 'REFUSED',
          handlerId: adminId,
          result: resultNote || 'Report dismissed',
        },
        { where: { id: reportId } }
      );
    } else {
      ctx.throw(400, 'Action must be "delete" or "dismiss"');
    }

    return ctx.model.PostFeedback.findByPk(reportId);
  }

  /**
   * Hide target content based on type
   * @param {string} targetType - 'post', 'comment', or 'user'
   * @param {number} targetId
   * @private
   */
  async _hideTarget(targetType, targetId) {
    const { ctx } = this;

    if (targetType === 'post') {
      await ctx.model.Post.update(
        { is_valid: false },
        { where: { id: targetId } }
      );
    } else if (targetType === 'comment') {
      const comment = await ctx.model.PostComment.findByPk(targetId);
      if (comment) {
        const { postId } = comment;
        await comment.destroy();
        await ctx.model.Post.update(
          { num_comments: this.app.Sequelize.literal('GREATEST(num_comments - 1, 0)') },
          { where: { id: postId } }
        );
      }
    } else if (targetType === 'user') {
      await ctx.model.User.update(
        { status: 'banned' },
        { where: { id: targetId } }
      );
    }
  }

  /**
   * Mute a user for a specified duration
   * @param {number} targetUserId - user to mute
   * @param {number} duration - days (7, 30, or -1 for permanent)
   * @param {number} adminId - requesting admin's userId
   * @returns {object} updated user
   */
  async muteUser(targetUserId, duration, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const user = await ctx.model.User.findByPk(targetUserId);
    if (!user) {
      ctx.throw(404, 'User not found');
    }

    const muteExpiry = duration === -1
      ? null
      : moment().add(duration, 'days').toDate();

    await ctx.model.User.update(
      {
        status: 'muted',
        muteExpiry,
      },
      { where: { id: targetUserId } }
    );

    return ctx.model.User.findByPk(targetUserId, {
      attributes: { exclude: ['password'] },
    });
  }

  /**
   * Ban a user permanently
   * @param {number} targetUserId - user to ban
   * @param {number} adminId - requesting admin's userId
   * @returns {object} updated user
   */
  async banUser(targetUserId, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const user = await ctx.model.User.findByPk(targetUserId);
    if (!user) {
      ctx.throw(404, 'User not found');
    }

    await ctx.model.User.update(
      {
        status: 'banned',
        muteExpiry: null,
      },
      { where: { id: targetUserId } }
    );

    return ctx.model.User.findByPk(targetUserId, {
      attributes: { exclude: ['password'] },
    });
  }

  /**
   * Unmute a user and restore normal status
   * @param {number} targetUserId - user to unmute
   * @param {number} adminId - requesting admin's userId
   * @returns {object} updated user
   */
  async unmuteUser(targetUserId, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const user = await ctx.model.User.findByPk(targetUserId);
    if (!user) {
      ctx.throw(404, 'User not found');
    }

    await ctx.model.User.update(
      {
        status: 'normal',
        muteExpiry: null,
      },
      { where: { id: targetUserId } }
    );

    return ctx.model.User.findByPk(targetUserId, {
      attributes: { exclude: ['password'] },
    });
  }

  /**
   * Add a word to the sensitive words list
   * @param {string} word - word to add
   * @param {string} category - word category
   * @param {number} adminId - requesting admin's userId
   * @returns {object} created sensitive word record
   */
  async addWord(word, category, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    if (!word || !word.trim()) {
      ctx.throw(400, 'Word is required');
    }

    if (!category) {
      ctx.throw(400, 'Category is required');
    }

    const existing = await ctx.model.SensitiveWord.findOne({
      where: { word: word.trim() },
    });

    if (existing) {
      ctx.throw(409, 'Word already exists in the sensitive words list');
    }

    const record = await ctx.model.SensitiveWord.create({
      word: word.trim(),
      category,
    });

    return record;
  }

  /**
   * Remove a word from the sensitive words list
   * @param {number} wordId - sensitive word record id
   * @param {number} adminId - requesting admin's userId
   */
  async removeWord(wordId, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const record = await ctx.model.SensitiveWord.findByPk(wordId);
    if (!record) {
      ctx.throw(404, 'Sensitive word not found');
    }

    await record.destroy();
  }

  /**
   * List reports with optional status filter and pagination
   * @param {object} params - { status, page, pageSize }
   * @param {number} adminId - requesting admin's userId
   * @returns {{ rows: object[], count: number, page: number, pageSize: number }}
   */
  async reportList({ status, page, pageSize }, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (currentPage - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { rows, count } = await ctx.model.PostFeedback.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'role'],
        },
      ],
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
   * List content (posts or comments) with pagination
   * @param {object} params - { type, page, pageSize }
   * @param {number} adminId - requesting admin's userId
   * @returns {{ rows: object[], count: number, page: number, pageSize: number }}
   */
  async contentList({ type, page, pageSize }, adminId) {
    const { ctx } = this;
    await this._requireAdmin(adminId);

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (currentPage - 1) * limit;

    if (type === 'posts') {
      const { rows, count } = await ctx.model.Post.findAndCountAll({
        include: [
          {
            model: ctx.model.User,
            as: 'user',
            attributes: ['id', 'name', 'avatar', 'role'],
          },
          {
            model: ctx.model.PostImage,
            as: 'images',
            attributes: ['id', 'url'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      return { rows, count, page: currentPage, pageSize: limit };
    }

    if (type === 'comments') {
      const { rows, count } = await ctx.model.PostComment.findAndCountAll({
        include: [
          {
            model: ctx.model.User,
            as: 'user',
            attributes: ['id', 'name', 'avatar', 'role'],
          },
          {
            model: ctx.model.Post,
            as: 'post',
            attributes: ['id', 'title'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return { rows, count, page: currentPage, pageSize: limit };
    }

    ctx.throw(400, 'Type must be "posts" or "comments"');
  }
}

module.exports = AdminService;
