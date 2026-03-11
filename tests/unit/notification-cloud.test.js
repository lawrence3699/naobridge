/**
 * Notification Cloud Function — Unit Tests
 * Covers: createNotification, getList, markRead, markAllRead, getUnreadCount
 */
const {
  handleCreateNotification,
  handleGetList,
  handleMarkRead,
  handleMarkAllRead,
  handleGetUnreadCount
} = require('../../cloudfunctions/notification/handlers');

function createMockDb() {
  const store = {};

  function buildQuery(col, query) {
    let filtered = query
      ? col.filter(item => Object.entries(query).every(([k, v]) => item[k] === v))
      : [...col];

    const chain = {
      _filtered: filtered,
      _sortField: null,
      _sortOrder: null,
      _skipCount: 0,
      _limitCount: 1000,

      orderBy(field, order) { chain._sortField = field; chain._sortOrder = order; return chain; },
      skip(n) { chain._skipCount = n; return chain; },
      limit(n) { chain._limitCount = n; return chain; },
      async count() { return { total: chain._filtered.length }; },
      async get() {
        let result = [...chain._filtered];
        if (chain._sortField) {
          result.sort((a, b) => chain._sortOrder === 'desc' ? (b[chain._sortField] > a[chain._sortField] ? 1 : -1) : (a[chain._sortField] > b[chain._sortField] ? 1 : -1));
        }
        result = result.slice(chain._skipCount, chain._skipCount + chain._limitCount);
        return { data: result };
      },
      async update({ data }) {
        let updated = 0;
        for (const item of col) {
          if (query && Object.entries(query).every(([k, v]) => item[k] === v)) {
            Object.assign(item, data);
            updated++;
          }
        }
        return { stats: { updated } };
      }
    };
    return chain;
  }

  return {
    store,
    collection(name) {
      if (!store[name]) store[name] = [];
      const col = store[name];
      return {
        where(query) { return buildQuery(col, query); },
        orderBy(field, order) { return buildQuery(col, null).orderBy(field, order); },
        skip(n) { return buildQuery(col, null).skip(n); },
        limit(n) { return buildQuery(col, null).limit(n); },
        async count() { return { total: col.length }; },
        async add({ data }) {
          const item = { _id: `n_${col.length + 1}`, ...data };
          col.push(item);
          return { _id: item._id };
        },
        doc(id) {
          return {
            async get() {
              const item = col.find(i => i._id === id);
              if (!item) { const err = new Error('not found'); err.errCode = -1; throw err; }
              return { data: item };
            },
            async update({ data }) {
              const item = col.find(i => i._id === id);
              if (item) Object.assign(item, data);
              return { stats: { updated: item ? 1 : 0 } };
            }
          };
        }
      };
    }
  };
}

describe('handleCreateNotification', () => {
  let db;
  beforeEach(() => { db = createMockDb(); db.store.notifications = []; });

  it('should create a comment notification', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'comment',
      title: '新评论',
      content: '用户B评论了你的帖子',
      relatedId: 'p1'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.notifications).toHaveLength(1);
    expect(db.store.notifications[0].isRead).toBe(false);
    expect(db.store.notifications[0].type).toBe('comment');
  });

  it('should create a reply notification', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'reply',
      title: '新回复',
      content: '用户B回复了你的评论',
      relatedId: 'p1'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.notifications[0].type).toBe('reply');
  });

  it('should create a system notification', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'system',
      title: '系统公告',
      content: '社区公约已更新，请查阅'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.notifications[0].type).toBe('system');
  });

  it('should create a report-result notification', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'report-result',
      title: '举报处理结果',
      content: '您的举报已处理，违规内容已删除',
      relatedId: 'r1'
    }, db);

    expect(result.code).toBe(0);
  });

  it('should return 1001 if userId is missing', async () => {
    const result = await handleCreateNotification({
      type: 'comment',
      title: '标题',
      content: '内容'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1001 if type is invalid', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'invalid',
      title: '标题',
      content: '内容'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1001 if title is missing', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'system',
      content: '内容'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1001 if content is missing', async () => {
    const result = await handleCreateNotification({
      userId: 'user_1',
      type: 'system',
      title: '标题'
    }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleGetList', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.notifications = [
      { _id: 'n1', userId: 'user_1', type: 'comment', title: '新评论', content: '内容1', relatedId: 'p1', isRead: false, createdAt: '2026-03-10T01:00:00.000Z' },
      { _id: 'n2', userId: 'user_1', type: 'system', title: '公告', content: '内容2', relatedId: null, isRead: true, createdAt: '2026-03-10T02:00:00.000Z' },
      { _id: 'n3', userId: 'user_2', type: 'comment', title: '其他人', content: '内容3', relatedId: 'p2', isRead: false, createdAt: '2026-03-10T03:00:00.000Z' },
      { _id: 'n4', userId: 'user_1', type: 'reply', title: '新回复', content: '内容4', relatedId: 'p1', isRead: false, createdAt: '2026-03-10T04:00:00.000Z' }
    ];
  });

  it('should return only the users notifications', async () => {
    const result = await handleGetList({ openid: 'user_1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.notifications).toHaveLength(3);
    expect(result.data.notifications.every(n => n.userId === 'user_1')).toBe(true);
  });

  it('should sort by createdAt descending (newest first)', async () => {
    const result = await handleGetList({ openid: 'user_1' }, db);

    const dates = result.data.notifications.map(n => n.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true);
    }
  });

  it('should return 1001 if openid is missing', async () => {
    const result = await handleGetList({}, db);
    expect(result.code).toBe(1001);
  });

  it('should return empty array for user with no notifications', async () => {
    const result = await handleGetList({ openid: 'user_99' }, db);
    expect(result.code).toBe(0);
    expect(result.data.notifications).toHaveLength(0);
  });

  it('should paginate with page and pageSize', async () => {
    const result = await handleGetList({ openid: 'user_1', page: 1, pageSize: 2 }, db);

    expect(result.code).toBe(0);
    expect(result.data.notifications.length).toBeLessThanOrEqual(2);
    expect(result.data.pagination.page).toBe(1);
    expect(result.data.pagination.pageSize).toBe(2);
  });
});

describe('handleMarkRead', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.notifications = [
      { _id: 'n1', userId: 'user_1', type: 'comment', isRead: false },
      { _id: 'n2', userId: 'user_2', type: 'comment', isRead: false }
    ];
  });

  it('should mark own notification as read', async () => {
    const result = await handleMarkRead({ openid: 'user_1', notificationId: 'n1' }, db);

    expect(result.code).toBe(0);
    expect(db.store.notifications[0].isRead).toBe(true);
  });

  it('should return 1002 if notification belongs to another user', async () => {
    const result = await handleMarkRead({ openid: 'user_1', notificationId: 'n2' }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1003 if notification not found', async () => {
    const result = await handleMarkRead({ openid: 'user_1', notificationId: 'nonexistent' }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1001 if notificationId is missing', async () => {
    const result = await handleMarkRead({ openid: 'user_1' }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleMarkAllRead', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.notifications = [
      { _id: 'n1', userId: 'user_1', isRead: false },
      { _id: 'n2', userId: 'user_1', isRead: false },
      { _id: 'n3', userId: 'user_2', isRead: false }
    ];
  });

  it('should mark all of the users notifications as read', async () => {
    const result = await handleMarkAllRead({ openid: 'user_1' }, db);

    expect(result.code).toBe(0);
    expect(db.store.notifications[0].isRead).toBe(true);
    expect(db.store.notifications[1].isRead).toBe(true);
    // Other user's notification unchanged
    expect(db.store.notifications[2].isRead).toBe(false);
  });

  it('should return 1001 if openid is missing', async () => {
    const result = await handleMarkAllRead({}, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleGetUnreadCount', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.notifications = [
      { _id: 'n1', userId: 'user_1', isRead: false },
      { _id: 'n2', userId: 'user_1', isRead: true },
      { _id: 'n3', userId: 'user_1', isRead: false },
      { _id: 'n4', userId: 'user_2', isRead: false }
    ];
  });

  it('should return correct unread count for user', async () => {
    const result = await handleGetUnreadCount({ openid: 'user_1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.count).toBe(2);
  });

  it('should return 0 for user with no unread', async () => {
    const result = await handleGetUnreadCount({ openid: 'user_99' }, db);
    expect(result.code).toBe(0);
    expect(result.data.count).toBe(0);
  });

  it('should return 1001 if openid is missing', async () => {
    const result = await handleGetUnreadCount({}, db);
    expect(result.code).toBe(1001);
  });
});
