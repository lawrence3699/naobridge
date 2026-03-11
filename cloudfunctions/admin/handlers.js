/**
 * Admin Handlers — pure business logic
 * All operations require admin verification
 */

const VALID_MUTE_DURATIONS = [7, 30, -1]; // -1 = permanent
const VALID_REVIEW_ACTIONS = ['delete', 'dismiss'];
const VALID_WORD_CATEGORIES = ['ad', 'fraud', 'discrimination', 'medical-fraud', 'violence'];

/**
 * Verify caller is an admin
 */
async function verifyAdmin(openid, db) {
  if (!openid) return { isAdmin: false };

  const { data: admins } = await db.collection('admins')
    .where({ _openid: openid })
    .get();

  return { isAdmin: admins.length > 0, admin: admins[0] || null };
}

/**
 * Get dashboard statistics
 */
async function handleGetStats(params, db) {
  const { openid } = params || {};
  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const [users, posts, comments, pendingReports] = await Promise.all([
    db.collection('users').count(),
    db.collection('posts').count(),
    db.collection('comments').count(),
    db.collection('reports').where({ status: 'pending' }).count()
  ]);

  return {
    code: 0,
    data: {
      totalUsers: users.total,
      totalPosts: posts.total,
      totalComments: comments.total,
      pendingReports: pendingReports.total
    },
    message: ''
  };
}

/**
 * Review a report (delete content or dismiss)
 */
async function handleReviewReport(params, db) {
  const { openid, reportId, action, resultNote = '' } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!reportId) return { code: 1001, data: null, message: '缺少必要参数：reportId' };

  if (!VALID_REVIEW_ACTIONS.includes(action)) {
    return { code: 1001, data: null, message: '无效的操作，允许值：delete, dismiss' };
  }

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  let report;
  try {
    const result = await db.collection('reports').doc(reportId).get();
    report = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '举报记录不存在' };
  }

  const now = new Date().toISOString();

  if (action === 'delete') {
    // Hide the target content
    if (report.targetType === 'post') {
      try {
        await db.collection('posts').doc(report.targetId).update({
          data: { status: 'hidden', updatedAt: now }
        });
      } catch (err) { /* target may already be deleted */ }
    } else if (report.targetType === 'comment') {
      try {
        await db.collection('comments').doc(report.targetId).update({
          data: { status: 'deleted', updatedAt: now }
        });
      } catch (err) { /* target may already be deleted */ }
    }

    await db.collection('reports').doc(reportId).update({
      data: { status: 'resolved', handlerId: openid, result: resultNote, updatedAt: now }
    });
  } else {
    // Dismiss
    await db.collection('reports').doc(reportId).update({
      data: { status: 'dismissed', handlerId: openid, result: resultNote, updatedAt: now }
    });
  }

  return { code: 0, data: null, message: '' };
}

/**
 * Mute a user for a specified duration
 */
async function handleMuteUser(params, db) {
  const { openid, targetOpenid, duration } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!targetOpenid) return { code: 1001, data: null, message: '缺少必要参数：targetOpenid' };

  if (!VALID_MUTE_DURATIONS.includes(duration)) {
    return { code: 1001, data: null, message: '无效的禁言时长，允许值：7天、30天、永久' };
  }

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const { data: users } = await db.collection('users').where({ _openid: targetOpenid }).get();
  if (users.length === 0) return { code: 1003, data: null, message: '目标用户不存在' };

  const muteExpiry = duration === -1
    ? new Date('2099-12-31T23:59:59.000Z').toISOString()
    : new Date(Date.now() + duration * 86400000).toISOString();

  await db.collection('users').where({ _openid: targetOpenid }).update({
    data: { status: 'muted', muteExpiry, updatedAt: new Date().toISOString() }
  });

  return { code: 0, data: null, message: '' };
}

/**
 * Ban a user permanently
 */
async function handleBanUser(params, db) {
  const { openid, targetOpenid } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!targetOpenid) return { code: 1001, data: null, message: '缺少必要参数：targetOpenid' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const { data: users } = await db.collection('users').where({ _openid: targetOpenid }).get();
  if (users.length === 0) return { code: 1003, data: null, message: '目标用户不存在' };

  await db.collection('users').where({ _openid: targetOpenid }).update({
    data: { status: 'banned', updatedAt: new Date().toISOString() }
  });

  return { code: 0, data: null, message: '' };
}

/**
 * Unmute a user
 */
async function handleUnmuteUser(params, db) {
  const { openid, targetOpenid } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!targetOpenid) return { code: 1001, data: null, message: '缺少必要参数：targetOpenid' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const { data: users } = await db.collection('users').where({ _openid: targetOpenid }).get();
  if (users.length === 0) return { code: 1003, data: null, message: '目标用户不存在' };

  await db.collection('users').where({ _openid: targetOpenid }).update({
    data: { status: 'normal', muteExpiry: null, updatedAt: new Date().toISOString() }
  });

  return { code: 0, data: null, message: '' };
}

/**
 * Add a sensitive word
 */
async function handleAddSensitiveWord(params, db) {
  const { openid, word, category } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!word || !word.trim()) return { code: 1001, data: null, message: '缺少必要参数：word' };

  if (!VALID_WORD_CATEGORIES.includes(category)) {
    return { code: 1001, data: null, message: '无效的敏感词分类' };
  }

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  // Check duplicate
  const { data: existing } = await db.collection('sensitive_words')
    .where({ word: word.trim() }).get();

  if (existing.length > 0) {
    return { code: 1001, data: null, message: '该敏感词已存在' };
  }

  await db.collection('sensitive_words').add({
    data: {
      word: word.trim(),
      category,
      createdAt: new Date().toISOString()
    }
  });

  return { code: 0, data: null, message: '' };
}

/**
 * Remove a sensitive word
 */
async function handleRemoveSensitiveWord(params, db) {
  const { openid, wordId } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!wordId) return { code: 1001, data: null, message: '缺少必要参数：wordId' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  await db.collection('sensitive_words').doc(wordId).remove();

  return { code: 0, data: null, message: '' };
}

/**
 * Get report list for admin review
 */
async function handleGetReportList(params, db) {
  const { openid, status: filterStatus, page = 1, pageSize = 20 } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const query = filterStatus ? { status: filterStatus } : {};

  const { total } = await db.collection('reports').where(query).count();
  const skip = (page - 1) * pageSize;
  const { data: reports } = await db.collection('reports')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return {
    code: 0,
    data: { reports, pagination: { page, pageSize, total } },
    message: ''
  };
}

/**
 * Get content list for admin review (posts or comments)
 */
async function handleGetContentList(params, db) {
  const { openid, type = 'posts', page = 1, pageSize = 20 } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const { isAdmin } = await verifyAdmin(openid, db);
  if (!isAdmin) return { code: 1002, data: null, message: '需要管理员权限' };

  const collectionName = type === 'posts' ? 'posts' : 'comments';
  const skip = (page - 1) * pageSize;

  const { total } = await db.collection(collectionName).count();
  const { data: items } = await db.collection(collectionName)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return {
    code: 0,
    data: { items, pagination: { page, pageSize, total } },
    message: ''
  };
}

module.exports = {
  handleGetStats,
  handleReviewReport,
  handleMuteUser,
  handleBanUser,
  handleUnmuteUser,
  handleAddSensitiveWord,
  handleRemoveSensitiveWord,
  handleGetReportList,
  handleGetContentList
};
