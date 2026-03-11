/**
 * Report Cloud Function — Unit Tests
 * Covers: createReport, getMyReports
 */
const {
  handleCreateReport,
  handleGetMyReports
} = require('../../cloudfunctions/report/handlers');

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
        limit(n) { return buildQuery(col, null).limit(n); },
        async add({ data }) {
          const item = { _id: `r_${col.length + 1}`, ...data };
          col.push(item);
          return { _id: item._id };
        }
      };
    }
  };
}

const VALID_REASONS = ['medical-fraud', 'ad-spam', 'harassment', 'violence', 'other'];

describe('handleCreateReport', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'reporter_1', nickName: '举报人', status: 'normal' }
    ];
    db.store.reports = [];
  });

  it('should create a report for a post', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'medical-fraud',
      description: '包含虚假医疗广告'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.reports).toHaveLength(1);
    expect(db.store.reports[0].targetType).toBe('post');
    expect(db.store.reports[0].status).toBe('pending');
    expect(db.store.reports[0].reporterId).toBe('reporter_1');
  });

  it('should create a report for a comment', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'comment',
      targetId: 'c1',
      reason: 'harassment'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.reports[0].targetType).toBe('comment');
  });

  it('should create a report for a user', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'user',
      targetId: 'u2',
      reason: 'ad-spam'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.reports[0].targetType).toBe('user');
  });

  it('should return 1001 if targetType is invalid', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'invalid',
      targetId: 'x1',
      reason: 'harassment'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('举报对象');
  });

  it('should return 1001 if targetId is missing', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      reason: 'harassment'
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should return 1001 if reason is missing', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('原因');
  });

  it('should return 1001 if reason is invalid', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'invalid_reason'
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should return 1001 if reason is "other" but no description', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'other',
      description: ''
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('说明');
  });

  it('should accept "other" reason with description', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'other',
      description: '这个帖子有问题，具体是...'
    }, db);

    expect(result.code).toBe(0);
  });

  it('should prevent duplicate reports by same user on same target', async () => {
    db.store.reports.push({
      _id: 'r_existing',
      reporterId: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'harassment',
      status: 'pending'
    });

    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'medical-fraud'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('已举报');
  });

  it('should return 1003 if reporter user not found', async () => {
    const result = await handleCreateReport({
      openid: 'nonexistent',
      targetType: 'post',
      targetId: 'p1',
      reason: 'harassment'
    }, db);

    expect(result.code).toBe(1003);
  });

  it('should not expose reporter identity in report data', async () => {
    const result = await handleCreateReport({
      openid: 'reporter_1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'harassment'
    }, db);

    expect(result.code).toBe(0);
    // reporterId stored internally but not returned
    expect(result.data.reporterId).toBeUndefined();
  });
});

describe('handleGetMyReports', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    db.store.reports = [
      { _id: 'r1', reporterId: 'user_1', targetType: 'post', targetId: 'p1', reason: 'harassment', status: 'pending', createdAt: '2026-03-10T00:00:00.000Z' },
      { _id: 'r2', reporterId: 'user_1', targetType: 'comment', targetId: 'c1', reason: 'ad-spam', status: 'resolved', result: '已删除违规内容', createdAt: '2026-03-09T00:00:00.000Z' },
      { _id: 'r3', reporterId: 'user_2', targetType: 'post', targetId: 'p2', reason: 'violence', status: 'pending', createdAt: '2026-03-08T00:00:00.000Z' }
    ];
  });

  it('should return only the users own reports', async () => {
    const result = await handleGetMyReports({ openid: 'user_1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.reports).toHaveLength(2);
    expect(result.data.reports.every(r => r.reporterId === 'user_1')).toBe(true);
  });

  it('should include report status and result', async () => {
    const result = await handleGetMyReports({ openid: 'user_1' }, db);

    const resolved = result.data.reports.find(r => r._id === 'r2');
    expect(resolved.status).toBe('resolved');
    expect(resolved.result).toBe('已删除违规内容');
  });

  it('should return empty array if user has no reports', async () => {
    const result = await handleGetMyReports({ openid: 'user_3' }, db);

    expect(result.code).toBe(0);
    expect(result.data.reports).toHaveLength(0);
  });

  it('should return 1001 if openid is missing', async () => {
    const result = await handleGetMyReports({}, db);
    expect(result.code).toBe(1001);
  });
});
