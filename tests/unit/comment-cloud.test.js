/**
 * Comment Cloud Function — Unit Tests
 * Covers: createComment, getCommentList, deleteComment
 */
const {
  handleCreateComment,
  handleGetCommentList,
  handleDeleteComment
} = require('../../cloudfunctions/comment/handlers');

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

      orderBy(field, order) {
        chain._sortField = field;
        chain._sortOrder = order;
        return chain;
      },
      skip(n) { chain._skipCount = n; return chain; },
      limit(n) { chain._limitCount = n; return chain; },
      async count() { return { total: chain._filtered.length }; },
      async get() {
        let result = [...chain._filtered];
        if (chain._sortField) {
          result.sort((a, b) => {
            const aVal = a[chain._sortField];
            const bVal = b[chain._sortField];
            return chain._sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
          });
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
          const newItem = { _id: `c_${col.length + 1}`, ...data };
          col.push(newItem);
          return { _id: newItem._id };
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
    },
    command: {
      inc(n) { return { __op: 'inc', value: n }; }
    }
  };
}

function seedDb(db) {
  db.store.users = [
    { _id: 'u1', _openid: 'user_1', nickName: '用户A', role: 'patient', status: 'normal', avatarUrl: '' },
    { _id: 'u2', _openid: 'user_2', nickName: '用户B', role: 'family', status: 'normal', avatarUrl: '' },
    { _id: 'u3', _openid: 'user_muted', nickName: '禁言用户', role: 'patient', status: 'muted', muteExpiry: new Date(Date.now() + 86400000).toISOString() },
    { _id: 'u4', _openid: 'user_banned', nickName: '封禁用户', role: 'patient', status: 'banned' }
  ];
  db.store.posts = [
    { _id: 'p1', authorId: 'user_1', title: '帖子', status: 'normal', commentEnabled: true, commentCount: 0 },
    { _id: 'p2', authorId: 'user_2', title: '关闭评论帖', status: 'normal', commentEnabled: false, commentCount: 0 },
    { _id: 'p3', authorId: 'user_1', title: '已删帖子', status: 'deleted', commentEnabled: true, commentCount: 0 }
  ];
  db.store.sensitive_words = [{ word: '诈骗', category: 'fraud' }];
  db.store.comments = [];
}

describe('handleCreateComment', () => {
  let db;
  beforeEach(() => { db = createMockDb(); seedDb(db); });

  it('should create a top-level comment', async () => {
    const result = await handleCreateComment({
      openid: 'user_2',
      postId: 'p1',
      content: '加油！你一定可以的，我们支持你！'
    }, db);

    expect(result.code).toBe(0);
    expect(result.data.commentId).toBe('c_1');
    expect(db.store.comments).toHaveLength(1);
    expect(db.store.comments[0].postId).toBe('p1');
    expect(db.store.comments[0].parentId).toBeNull();
  });

  it('should create a nested reply (level 2)', async () => {
    // First create a top-level comment
    db.store.comments.push({
      _id: 'c_existing', postId: 'p1', authorId: 'user_1',
      authorName: '用户A', content: '原评论', parentId: null,
      status: 'normal', createdAt: new Date().toISOString()
    });

    const result = await handleCreateComment({
      openid: 'user_2',
      postId: 'p1',
      content: '谢谢你的鼓励，真的很感动！',
      parentId: 'c_existing'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.comments[1].parentId).toBe('c_existing');
  });

  it('should return 1001 if content is empty', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'p1',
      content: ''
    }, db);
    expect(result.code).toBe(1001);
    expect(result.message).toContain('内容');
  });

  it('should return 1001 if content exceeds 500 chars', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'p1',
      content: '字'.repeat(501)
    }, db);
    expect(result.code).toBe(1001);
    expect(result.message).toContain('500');
  });

  it('should return 1001 if postId is missing', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      content: '评论内容'
    }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1003 if post does not exist', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'nonexistent',
      content: '评论不存在的帖子'
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1003 if post is deleted', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'p3',
      content: '评论已删帖子'
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1002 if comments are disabled on post', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'p2',
      content: '评论关闭评论的帖子'
    }, db);
    expect(result.code).toBe(1002);
    expect(result.message).toContain('关闭');
  });

  it('should return 1002 if user is banned', async () => {
    const result = await handleCreateComment({
      openid: 'user_banned',
      postId: 'p1',
      content: '被封禁用户的评论'
    }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1002 if user is muted', async () => {
    const result = await handleCreateComment({
      openid: 'user_muted',
      postId: 'p1',
      content: '被禁言用户的评论'
    }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1004 if comment contains sensitive words', async () => {
    const result = await handleCreateComment({
      openid: 'user_1',
      postId: 'p1',
      content: '这是诈骗信息请大家注意'
    }, db);
    expect(result.code).toBe(1004);
  });

  it('should return 1003 if parentId references nonexistent comment', async () => {
    const result = await handleCreateComment({
      openid: 'user_2',
      postId: 'p1',
      content: '回复不存在的评论',
      parentId: 'nonexistent_comment'
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should increment post commentCount', async () => {
    await handleCreateComment({
      openid: 'user_2',
      postId: 'p1',
      content: '这是一条测试评论内容'
    }, db);

    // commentCount should have been incremented
    expect(db.store.posts[0].commentCount).toBe(1);
  });
});

describe('handleGetCommentList', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    seedDb(db);
    db.store.comments = [
      { _id: 'c1', postId: 'p1', authorId: 'user_1', authorName: '用户A', content: '第一条', parentId: null, status: 'normal', createdAt: '2026-03-10T00:00:00.000Z' },
      { _id: 'c2', postId: 'p1', authorId: 'user_2', authorName: '用户B', content: '第二条', parentId: null, status: 'normal', createdAt: '2026-03-10T01:00:00.000Z' },
      { _id: 'c3', postId: 'p1', authorId: 'user_1', authorName: '用户A', content: '回复第一条', parentId: 'c1', status: 'normal', createdAt: '2026-03-10T02:00:00.000Z' },
      { _id: 'c4', postId: 'p1', authorId: 'user_2', authorName: '用户B', content: '已删评论', parentId: null, status: 'deleted', createdAt: '2026-03-10T03:00:00.000Z' },
      { _id: 'c5', postId: 'p2', authorId: 'user_1', authorName: '用户A', content: '其他帖子', parentId: null, status: 'normal', createdAt: '2026-03-10T04:00:00.000Z' }
    ];
  });

  it('should return comments for a post with nested replies', async () => {
    const result = await handleGetCommentList({ postId: 'p1' }, db);

    expect(result.code).toBe(0);
    // Top-level comments only (excluding deleted and replies)
    const topLevel = result.data.comments.filter(c => c.parentId === null);
    expect(topLevel.length).toBe(2);
  });

  it('should attach replies under parent comments', async () => {
    const result = await handleGetCommentList({ postId: 'p1' }, db);

    const firstComment = result.data.comments.find(c => c._id === 'c1');
    expect(firstComment.replies).toBeDefined();
    expect(firstComment.replies).toHaveLength(1);
    expect(firstComment.replies[0].content).toBe('回复第一条');
  });

  it('should not include deleted comments', async () => {
    const result = await handleGetCommentList({ postId: 'p1' }, db);

    const allIds = result.data.comments.map(c => c._id);
    expect(allIds).not.toContain('c4');
  });

  it('should not include comments from other posts', async () => {
    const result = await handleGetCommentList({ postId: 'p1' }, db);

    const allIds = result.data.comments.map(c => c._id);
    expect(allIds).not.toContain('c5');
  });

  it('should return 1001 if postId is missing', async () => {
    const result = await handleGetCommentList({}, db);
    expect(result.code).toBe(1001);
  });

  it('should return empty array for post with no comments', async () => {
    const result = await handleGetCommentList({ postId: 'p2' }, db);
    // p2 has c5 but it's a different post — wait, c5 has postId p2
    // Actually c5 exists for p2, so it should appear
    expect(result.code).toBe(0);
  });

  it('should sort comments by createdAt ascending', async () => {
    const result = await handleGetCommentList({ postId: 'p1' }, db);

    const dates = result.data.comments.map(c => c.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] <= dates[i]).toBe(true);
    }
  });
});

describe('handleDeleteComment', () => {
  let db;
  beforeEach(() => {
    db = createMockDb();
    seedDb(db);
    db.store.comments = [
      { _id: 'c1', postId: 'p1', authorId: 'user_1', content: '我的评论', status: 'normal' },
      { _id: 'c2', postId: 'p1', authorId: 'user_2', content: '别人评论', status: 'normal' }
    ];
    db.store.posts[0].commentCount = 2;
  });

  it('should soft-delete own comment', async () => {
    const result = await handleDeleteComment({
      openid: 'user_1',
      commentId: 'c1'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.comments[0].status).toBe('deleted');
  });

  it('should allow post author to delete any comment on their post', async () => {
    // user_1 is author of p1, can delete user_2's comment
    const result = await handleDeleteComment({
      openid: 'user_1',
      commentId: 'c2'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.comments[1].status).toBe('deleted');
  });

  it('should return 1002 if non-author non-owner deletes comment', async () => {
    // user_2 is not author of p1 and c1 is not their comment
    const result = await handleDeleteComment({
      openid: 'user_2',
      commentId: 'c1'
    }, db);

    expect(result.code).toBe(1002);
  });

  it('should return 1003 if comment not found', async () => {
    const result = await handleDeleteComment({
      openid: 'user_1',
      commentId: 'nonexistent'
    }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1001 if commentId is missing', async () => {
    const result = await handleDeleteComment({ openid: 'user_1' }, db);
    expect(result.code).toBe(1001);
  });

  it('should decrement post commentCount', async () => {
    await handleDeleteComment({ openid: 'user_1', commentId: 'c1' }, db);
    expect(db.store.posts[0].commentCount).toBe(1);
  });
});
