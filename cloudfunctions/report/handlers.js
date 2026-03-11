/**
 * Report Handlers — pure business logic
 */

const VALID_TARGET_TYPES = ['post', 'comment', 'user'];
const VALID_REASONS = ['medical-fraud', 'ad-spam', 'harassment', 'violence', 'other'];

/**
 * Create a new report
 */
async function handleCreateReport(params, db) {
  const { openid, targetType, targetId, reason, description = '' } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!targetId) return { code: 1001, data: null, message: '缺少必要参数：targetId' };

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return { code: 1001, data: null, message: '无效的举报对象类型，允许值：帖子、评论、用户' };
  }

  if (!reason || !VALID_REASONS.includes(reason)) {
    return { code: 1001, data: null, message: '请选择举报原因' };
  }

  if (reason === 'other' && (!description || !description.trim())) {
    return { code: 1001, data: null, message: '选择"其他"原因时请填写具体说明' };
  }

  // Check reporter exists
  const { data: users } = await db.collection('users').where({ _openid: openid }).get();
  if (users.length === 0) {
    return { code: 1003, data: null, message: '用户不存在' };
  }

  // Check for duplicate report
  const { data: existing } = await db.collection('reports').where({
    reporterId: openid,
    targetType,
    targetId,
    status: 'pending'
  }).get();

  if (existing.length > 0) {
    return { code: 1001, data: null, message: '您已举报过该内容，请等待处理' };
  }

  const now = new Date().toISOString();
  const newReport = {
    reporterId: openid,
    targetType,
    targetId,
    reason,
    description: description.trim(),
    status: 'pending',
    handlerId: null,
    result: null,
    createdAt: now
  };

  const { _id } = await db.collection('reports').add({ data: newReport });

  return {
    code: 0,
    data: { reportId: _id },
    message: ''
  };
}

/**
 * Get reports submitted by the user
 */
async function handleGetMyReports(params, db) {
  const { openid } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const { data: reports } = await db
    .collection('reports')
    .where({ reporterId: openid })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return {
    code: 0,
    data: { reports },
    message: ''
  };
}

module.exports = {
  handleCreateReport,
  handleGetMyReports
};
