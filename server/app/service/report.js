'use strict';

const { Service } = require('egg');

const VALID_TARGET_TYPES = ['post', 'comment', 'user'];
const VALID_REASONS = ['medical-fraud', 'ad-spam', 'harassment', 'violence', 'other'];
const MAX_MY_REPORTS = 50;

class ReportService extends Service {

  /**
   * Create a new report
   * @param {object} params - { targetType, targetId, reason, description, userId }
   * @returns {object} created report
   */
  async create({ targetType, targetId, reason, description, userId }) {
    const { ctx } = this;

    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      ctx.throw(400, `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}`);
    }

    if (!targetId) {
      ctx.throw(400, 'targetId is required');
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      ctx.throw(400, `reason must be one of: ${VALID_REASONS.join(', ')}`);
    }

    if (reason === 'other' && (!description || !description.trim())) {
      ctx.throw(400, 'Description is required when reason is "other"');
    }

    // Check for duplicate pending report from same user on same target
    const existing = await ctx.model.PostFeedback.findOne({
      where: {
        userId,
        targetType,
        targetId,
        status: 'PENDING',
      },
    });

    if (existing) {
      ctx.throw(409, 'You already have a pending report for this target');
    }

    const report = await ctx.model.PostFeedback.create({
      userId,
      postId: targetType === 'post' ? targetId : null,
      subject: `Report: ${targetType} #${targetId}`,
      reason,
      description: description || null,
      targetType,
      targetId,
      status: 'PENDING',
    });

    return report;
  }

  /**
   * Get current user's reports
   * @param {number} userId
   * @returns {object[]} list of reports
   */
  async myReports(userId) {
    const { ctx } = this;

    const reports = await ctx.model.PostFeedback.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: MAX_MY_REPORTS,
    });

    return reports;
  }
}

module.exports = ReportService;
