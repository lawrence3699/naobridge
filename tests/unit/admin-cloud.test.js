/**
 * Admin Cloud Function — Unit Tests
 * Covers: getStats, reviewReport, muteUser, banUser, unmuteUser,
 *         manageSensitiveWord, getReportList, getContentList
 */
const {
  handleGetStats,
  handleReviewReport,
  handleMuteUser,
  handleBanUser,
  handleUnmuteUser,
  handleAddSensitiveWord,
  handleRemoveSensitiveWord,
  handleGetReportList,
  handleGetContentList
} = require('../../cloudfunctions/admin/handlers');

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
          const item = { _id: `id_${col.length + 1}`, ...data };
          col.push(item);
          return { _id: item._id };
        },
        doc(id) {
          return {
            async get() {
              const item = col.find(i => i._id === id);
              if (!item) { const err = new Error('not found'); throw err; }
              return { data: item };
            },
            async update({ data }) {
              const item = col.find(i => i._id === id);
              if (item) Object.assign(item, data);
              return { stats: { updated: item ? 1 : 0 } };
            },
            async remove() {
              const idx = col.findIndex(i => i._id === id);
              if (idx >= 0) col.splice(idx, 1);
              return { stats: { removed: idx >= 0 ? 1 : 0 } };
            }
          };
        }
      };
    }
  };
}

function seedDb(db) {
  db.store.admins = [
    { _id: 'a1', _openid: 'admin_1', level: 'super', permissions: ['all'] }
  ];
  db.store.users = [
    { _id: 'u1', _openid: 'user_1', nickName: '普通用户', status: 'normal' },
    { _id: 'u2', _openid: 'user_2', nickName: '已禁言', status: 'muted', muteExpiry: new Date(Date.now() + 86400000).toISOString() }
  ];
  db.store.posts = [
    { _id: 'p1', authorId: 'user_1', title: '帖子1', status: 'normal', createdAt: '2026-03-10T00:00:00.000Z' },
    { _id: 'p2', authorId: 'user_1', title: '帖子2', status: 'normal', createdAt: '2026-03-11T00:00:00.000Z' }
  ];
  db.store.reports = [
    { _id: 'r1', reporterId: 'user_1', targetType: 'post', targetId: 'p1', reason: 'harassment', status: 'pending', createdAt: '2026-03-10T00:00:00.000Z' },
    { _id: 'r2', reporterId: 'user_2', targetType: 'comment', targetId: 'c1', reason: 'ad-spam', status: 'resolved', createdAt: '2026-03-09T00:00:00.000Z' }
  ];
  db.store.comments = [];
  db.store.sensitive_words = [
    { _id: 'sw1', word: '诈骗', category: 'fraud', createdAt: '2026-01-01T00:00:00.000Z' }
  ];
  db.store.notifications = [];
}

describe('handleGetStats', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should return dashboard stats for admin', async () => {
    const result = await handleGetStats({ openid: 'admin_1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.totalUsers).toBe(2);
    expect(result.data.totalPosts).toBe(2);
    expect(result.data.pendingReports).toBe(1);
    expect(typeof result.data.totalComments).toBe('number');
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleGetStats({ openid: 'user_1' }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1001 if openid is missing', async () => {
    const result = await handleGetStats({}, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleReviewReport', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should resolve a report with action "delete"', async () => {
    const result = await handleReviewReport({
      openid: 'admin_1',
      reportId: 'r1',
      action: 'delete',
      resultNote: '内容违规，已删除'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.reports[0].status).toBe('resolved');
    expect(db.store.reports[0].result).toBe('内容违规，已删除');
    expect(db.store.reports[0].handlerId).toBe('admin_1');
    // Target post should be hidden
    expect(db.store.posts[0].status).toBe('hidden');
  });

  it('should dismiss a report with action "dismiss"', async () => {
    const result = await handleReviewReport({
      openid: 'admin_1',
      reportId: 'r1',
      action: 'dismiss',
      resultNote: '内容未违规'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.reports[0].status).toBe('dismissed');
    // Target post should NOT be hidden
    expect(db.store.posts[0].status).toBe('normal');
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleReviewReport({
      openid: 'user_1',
      reportId: 'r1',
      action: 'delete'
    }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1003 if report not found', async () => {
    const result = await handleReviewReport({
      openid: 'admin_1',
      reportId: 'nonexistent',
      action: 'delete'
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1001 if action is invalid', async () => {
    const result = await handleReviewReport({
      openid: 'admin_1',
      reportId: 'r1',
      action: 'invalid'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1001 if reportId is missing', async () => {
    const result = await handleReviewReport({ openid: 'admin_1', action: 'delete' }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleMuteUser', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should mute a user for 7 days', async () => {
    const result = await handleMuteUser({
      openid: 'admin_1',
      targetOpenid: 'user_1',
      duration: 7
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.users[0].status).toBe('muted');
    expect(db.store.users[0].muteExpiry).toBeDefined();
  });

  it('should mute a user for 30 days', async () => {
    const result = await handleMuteUser({
      openid: 'admin_1',
      targetOpenid: 'user_1',
      duration: 30
    }, db);

    expect(result.code).toBe(0);
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleMuteUser({
      openid: 'user_1',
      targetOpenid: 'user_2',
      duration: 7
    }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1003 if target user not found', async () => {
    const result = await handleMuteUser({
      openid: 'admin_1',
      targetOpenid: 'nonexistent',
      duration: 7
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1001 if duration is invalid', async () => {
    const result = await handleMuteUser({
      openid: 'admin_1',
      targetOpenid: 'user_1',
      duration: 999
    }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleBanUser', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should ban a user', async () => {
    const result = await handleBanUser({
      openid: 'admin_1',
      targetOpenid: 'user_1'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.users[0].status).toBe('banned');
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleBanUser({ openid: 'user_1', targetOpenid: 'user_2' }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1003 if target user not found', async () => {
    const result = await handleBanUser({ openid: 'admin_1', targetOpenid: 'nonexistent' }, db);
    expect(result.code).toBe(1003);
  });
});

describe('handleUnmuteUser', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should unmute a muted user', async () => {
    const result = await handleUnmuteUser({
      openid: 'admin_1',
      targetOpenid: 'user_2'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.users[1].status).toBe('normal');
    expect(db.store.users[1].muteExpiry).toBeNull();
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleUnmuteUser({ openid: 'user_1', targetOpenid: 'user_2' }, db);
    expect(result.code).toBe(1002);
  });
});

describe('handleAddSensitiveWord', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should add a new sensitive word', async () => {
    const result = await handleAddSensitiveWord({
      openid: 'admin_1',
      word: '新敏感词',
      category: 'ad'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.sensitive_words).toHaveLength(2);
  });

  it('should return 1001 if word already exists', async () => {
    const result = await handleAddSensitiveWord({
      openid: 'admin_1',
      word: '诈骗',
      category: 'fraud'
    }, db);
    expect(result.code).toBe(1001);
    expect(result.message).toContain('已存在');
  });

  it('should return 1001 if category is invalid', async () => {
    const result = await handleAddSensitiveWord({
      openid: 'admin_1',
      word: '测试',
      category: 'invalid_cat'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleAddSensitiveWord({
      openid: 'user_1',
      word: '测试',
      category: 'ad'
    }, db);
    expect(result.code).toBe(1002);
  });
});

describe('handleRemoveSensitiveWord', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should remove a sensitive word', async () => {
    const result = await handleRemoveSensitiveWord({
      openid: 'admin_1',
      wordId: 'sw1'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.sensitive_words).toHaveLength(0);
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleRemoveSensitiveWord({ openid: 'user_1', wordId: 'sw1' }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1001 if wordId is missing', async () => {
    const result = await handleRemoveSensitiveWord({ openid: 'admin_1' }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleGetReportList', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should return all reports for admin', async () => {
    const result = await handleGetReportList({ openid: 'admin_1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.reports.length).toBe(2);
  });

  it('should filter by status', async () => {
    const result = await handleGetReportList({ openid: 'admin_1', status: 'pending' }, db);

    expect(result.code).toBe(0);
    expect(result.data.reports.every(r => r.status === 'pending')).toBe(true);
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleGetReportList({ openid: 'user_1' }, db);
    expect(result.code).toBe(1002);
  });
});

describe('handleGetContentList', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should return all posts for admin review', async () => {
    const result = await handleGetContentList({ openid: 'admin_1', type: 'posts' }, db);

    expect(result.code).toBe(0);
    expect(result.data.items.length).toBe(2);
  });

  it('should return 1002 if caller is not admin', async () => {
    const result = await handleGetContentList({ openid: 'user_1', type: 'posts' }, db);
    expect(result.code).toBe(1002);
  });
});
