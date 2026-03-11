/**
 * Notification Handlers — pure business logic
 */

const VALID_TYPES = ['comment', 'reply', 'system', 'report-result'];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Create a notification (called internally by other cloud functions)
 */
async function handleCreateNotification(params, db) {
  const { userId, type, title, content, relatedId = null } = params || {};

  if (!userId) return { code: 1001, data: null, message: '缺少必要参数：userId' };

  if (!VALID_TYPES.includes(type)) {
    return { code: 1001, data: null, message: '无效的通知类型' };
  }

  if (!title || !title.trim()) {
    return { code: 1001, data: null, message: '缺少必要参数：title' };
  }

  if (!content || !content.trim()) {
    return { code: 1001, data: null, message: '缺少必要参数：content' };
  }

  const now = new Date().toISOString();
  const notification = {
    userId,
    type,
    title: title.trim(),
    content: content.trim(),
    relatedId,
    isRead: false,
    createdAt: now
  };

  const { _id } = await db.collection('notifications').add({ data: notification });

  return {
    code: 0,
    data: { notificationId: _id },
    message: ''
  };
}

/**
 * Get paginated notification list for a user
 */
async function handleGetList(params, db) {
  const { openid, page = 1, pageSize: rawPageSize = DEFAULT_PAGE_SIZE } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  const { total } = await db.collection('notifications').where({ userId: openid }).count();

  const skip = (page - 1) * pageSize;
  const { data: notifications } = await db
    .collection('notifications')
    .where({ userId: openid })
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return {
    code: 0,
    data: {
      notifications,
      pagination: { page, pageSize, total }
    },
    message: ''
  };
}

/**
 * Mark a single notification as read
 */
async function handleMarkRead(params, db) {
  const { openid, notificationId } = params || {};

  if (!notificationId) return { code: 1001, data: null, message: '缺少必要参数：notificationId' };

  let notification;
  try {
    const result = await db.collection('notifications').doc(notificationId).get();
    notification = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '通知不存在' };
  }

  if (notification.userId !== openid) {
    return { code: 1002, data: null, message: '无权操作该通知' };
  }

  await db.collection('notifications').doc(notificationId).update({
    data: { isRead: true }
  });

  return { code: 0, data: null, message: '' };
}

/**
 * Mark all of a user's notifications as read
 */
async function handleMarkAllRead(params, db) {
  const { openid } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  await db.collection('notifications')
    .where({ userId: openid, isRead: false })
    .update({ data: { isRead: true } });

  return { code: 0, data: null, message: '' };
}

/**
 * Get unread notification count
 */
async function handleGetUnreadCount(params, db) {
  const { openid } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };

  const { total } = await db.collection('notifications')
    .where({ userId: openid, isRead: false })
    .count();

  return {
    code: 0,
    data: { count: total },
    message: ''
  };
}

module.exports = {
  handleCreateNotification,
  handleGetList,
  handleMarkRead,
  handleMarkAllRead,
  handleGetUnreadCount
};
