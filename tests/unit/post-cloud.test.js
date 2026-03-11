/**
 * Post Cloud Function — Unit Tests
 * Covers: createPost, getPostList, getPostDetail, updatePost, deletePost
 */
const {
  handleCreatePost,
  handleGetPostList,
  handleGetPostDetail,
  handleUpdatePost,
  handleDeletePost
} = require('../../cloudfunctions/post/handlers');

const VALID_CATEGORIES = ['recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'];

// Mock database with pagination support
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
      _limitCount: 20,

      orderBy(field, order) {
        chain._sortField = field;
        chain._sortOrder = order;
        return chain;
      },
      skip(n) {
        chain._skipCount = n;
        return chain;
      },
      limit(n) {
        chain._limitCount = n;
        return chain;
      },
      async count() {
        return { total: chain._filtered.length };
      },
      async get() {
        let result = [...chain._filtered];
        if (chain._sortField) {
          result.sort((a, b) => {
            const aVal = a[chain._sortField];
            const bVal = b[chain._sortField];
            return chain._sortOrder === 'desc'
              ? (bVal > aVal ? 1 : -1)
              : (aVal > bVal ? 1 : -1);
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
        where(query) {
          return buildQuery(col, query);
        },
        orderBy(field, order) {
          return buildQuery(col, null).orderBy(field, order);
        },
        skip(n) {
          return buildQuery(col, null).skip(n);
        },
        limit(n) {
          return buildQuery(col, null).limit(n);
        },
        async count() {
          return { total: col.length };
        },
        async add({ data }) {
          const newItem = { _id: `post_${col.length + 1}`, ...data };
          col.push(newItem);
          return { _id: newItem._id };
        },
        doc(id) {
          return {
            async get() {
              const item = col.find(i => i._id === id);
              if (!item) {
                const err = new Error('document not found');
                err.errCode = -1;
                throw err;
              }
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

// Stub filter that always passes
const cleanFilter = { check: () => ({ safe: true, keywords: [], filtered: '' }) };

// Stub filter that blocks
const blockFilter = {
  check: (text) => ({ safe: false, keywords: ['blocked'], filtered: text.replace(/blocked/g, '***') })
};

describe('handleCreatePost', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'author_1', nickName: '测试作者', role: 'patient', status: 'normal', avatarUrl: '' }
    ];
    db.store.sensitive_words = [{ word: '诈骗', category: 'fraud' }];
  });

  it('should create a post with valid data', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '我的康复日记第一天',
      content: '今天开始了新的康复训练，感觉很有希望。加油加油！',
      category: 'recovery',
      images: []
    }, db);

    expect(result.code).toBe(0);
    expect(result.data.postId).toBe('post_1');
    expect(db.store.posts).toHaveLength(1);
    expect(db.store.posts[0].title).toBe('我的康复日记第一天');
    expect(db.store.posts[0].status).toBe('normal');
    expect(db.store.posts[0].commentEnabled).toBe(true);
  });

  it('should return 1001 if title is missing', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      content: '内容内容内容内容内容内容',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('标题');
  });

  it('should return 1001 if content is too short (< 10 chars)', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '标题',
      content: '太短了',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('10');
  });

  it('should return 1001 if content exceeds 5000 chars', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '标题',
      content: '字'.repeat(5001),
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('5000');
  });

  it('should return 1001 if category is invalid', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '标题',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'invalid_cat'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('分类');
  });

  it('should accept all valid categories', async () => {
    for (const category of VALID_CATEGORIES) {
      const result = await handleCreatePost({
        openid: 'author_1',
        title: `标题_${category}`,
        content: '这是正文内容，足够长了吧应该有十个字了',
        category,
        images: []
      }, db);
      expect(result.code).toBe(0);
    }
    expect(db.store.posts).toHaveLength(VALID_CATEGORIES.length);
  });

  it('should return 1001 if more than 9 images', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '标题',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'recovery',
      images: Array(10).fill('cloud://image.jpg')
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('9');
  });

  it('should return 1002 if user is banned', async () => {
    db.store.users = [
      { _id: 'u1', _openid: 'banned_user', nickName: 'Banned', status: 'banned' }
    ];

    const result = await handleCreatePost({
      openid: 'banned_user',
      title: '标题',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1002);
  });

  it('should return 1002 if user is muted', async () => {
    db.store.users = [
      {
        _id: 'u1', _openid: 'muted_user', nickName: 'Muted', status: 'muted',
        muteExpiry: new Date(Date.now() + 86400000).toISOString()
      }
    ];

    const result = await handleCreatePost({
      openid: 'muted_user',
      title: '标题',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1002);
  });

  it('should return 1003 if user does not exist', async () => {
    const result = await handleCreatePost({
      openid: 'nonexistent',
      title: '标题',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1003);
  });

  it('should return 1004 if title contains sensitive words', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '这是诈骗信息',
      content: '这是正文内容，足够长了吧应该有十个字了',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1004);
  });

  it('should return 1004 if content contains sensitive words', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '正常标题',
      content: '这里有诈骗信息请大家注意这个帖子',
      category: 'recovery'
    }, db);

    expect(result.code).toBe(1004);
  });

  it('should initialize counters to zero', async () => {
    const result = await handleCreatePost({
      openid: 'author_1',
      title: '我的康复日记',
      content: '今天开始了新的康复训练，感觉很有希望！',
      category: 'recovery',
      images: []
    }, db);

    expect(result.code).toBe(0);
    const post = db.store.posts[0];
    expect(post.viewCount).toBe(0);
    expect(post.likeCount).toBe(0);
    expect(post.commentCount).toBe(0);
  });
});

describe('handleGetPostList', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    db.store.posts = [
      { _id: 'p1', authorId: 'author_1', authorName: 'Alice', title: '帖子一', content: '内容一', category: 'recovery', status: 'normal', createdAt: '2026-03-10T00:00:00.000Z', viewCount: 10, likeCount: 5, commentCount: 2 },
      { _id: 'p2', authorId: 'author_2', authorName: 'Bob', title: '帖子二', content: '内容二', category: 'bci', status: 'normal', createdAt: '2026-03-11T00:00:00.000Z', viewCount: 20, likeCount: 8, commentCount: 3 },
      { _id: 'p3', authorId: 'author_1', authorName: 'Alice', title: '帖子三', content: '内容三', category: 'recovery', status: 'hidden', createdAt: '2026-03-09T00:00:00.000Z', viewCount: 5, likeCount: 1, commentCount: 0 },
      { _id: 'p4', authorId: 'author_3', authorName: 'Charlie', title: '帖子四', content: '内容四', category: 'emotional', status: 'normal', createdAt: '2026-03-08T00:00:00.000Z', viewCount: 3, likeCount: 0, commentCount: 1 }
    ];
  });

  it('should return only normal posts', async () => {
    const result = await handleGetPostList({}, db);

    expect(result.code).toBe(0);
    expect(result.data.posts.every(p => p.status === 'normal')).toBe(true);
    expect(result.data.posts.find(p => p._id === 'p3')).toBeUndefined();
  });

  it('should filter by category', async () => {
    const result = await handleGetPostList({ category: 'recovery' }, db);

    expect(result.code).toBe(0);
    expect(result.data.posts.every(p => p.category === 'recovery')).toBe(true);
  });

  it('should paginate with page and pageSize', async () => {
    const result = await handleGetPostList({ page: 1, pageSize: 2 }, db);

    expect(result.code).toBe(0);
    expect(result.data.posts.length).toBeLessThanOrEqual(2);
    expect(result.data.pagination).toBeDefined();
    expect(result.data.pagination.page).toBe(1);
    expect(result.data.pagination.pageSize).toBe(2);
  });

  it('should return total count in pagination', async () => {
    const result = await handleGetPostList({}, db);

    expect(result.data.pagination.total).toBeDefined();
    expect(typeof result.data.pagination.total).toBe('number');
  });

  it('should sort by createdAt descending by default', async () => {
    const result = await handleGetPostList({}, db);

    const dates = result.data.posts.map(p => p.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true);
    }
  });

  it('should default pageSize to 20', async () => {
    const result = await handleGetPostList({}, db);
    expect(result.data.pagination.pageSize).toBe(20);
  });

  it('should cap pageSize at 50', async () => {
    const result = await handleGetPostList({ pageSize: 100 }, db);
    expect(result.data.pagination.pageSize).toBe(50);
  });
});

describe('handleGetPostDetail', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    db.store.posts = [
      {
        _id: 'p1', authorId: 'author_1', title: '帖子标题',
        content: '帖子正文内容很长很长', category: 'recovery',
        images: ['cloud://img1.jpg'], status: 'normal',
        commentEnabled: true, isPinned: false, isFeatured: false,
        viewCount: 10, likeCount: 5, commentCount: 2,
        createdAt: '2026-03-10T00:00:00.000Z'
      },
      {
        _id: 'p2', authorId: 'author_2', title: '隐藏帖子',
        content: '被隐藏的内容', status: 'hidden',
        viewCount: 0, likeCount: 0, commentCount: 0,
        createdAt: '2026-03-09T00:00:00.000Z'
      }
    ];
    db.store.users = [
      { _id: 'u1', _openid: 'author_1', nickName: '作者', role: 'patient', avatarUrl: '' }
    ];
  });

  it('should return post detail with author info', async () => {
    const result = await handleGetPostDetail({ postId: 'p1' }, db);

    expect(result.code).toBe(0);
    expect(result.data.title).toBe('帖子标题');
    expect(result.data.author).toBeDefined();
    expect(result.data.author.nickName).toBe('作者');
    expect(result.data.author._openid).toBeUndefined();
  });

  it('should increment viewCount', async () => {
    await handleGetPostDetail({ postId: 'p1' }, db);
    expect(db.store.posts[0].viewCount).toBe(11);
  });

  it('should return 1001 if postId is missing', async () => {
    const result = await handleGetPostDetail({}, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1003 if post not found', async () => {
    const result = await handleGetPostDetail({ postId: 'nonexistent' }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1003 for hidden/deleted posts', async () => {
    const result = await handleGetPostDetail({ postId: 'p2' }, db);
    expect(result.code).toBe(1003);
  });
});

describe('handleDeletePost', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    db.store.posts = [
      { _id: 'p1', authorId: 'author_1', title: '我的帖子', status: 'normal' },
      { _id: 'p2', authorId: 'author_2', title: '别人的帖子', status: 'normal' }
    ];
  });

  it('should soft-delete own post', async () => {
    const result = await handleDeletePost({ openid: 'author_1', postId: 'p1' }, db);

    expect(result.code).toBe(0);
    expect(db.store.posts[0].status).toBe('deleted');
  });

  it('should return 1002 if deleting another users post', async () => {
    const result = await handleDeletePost({ openid: 'author_1', postId: 'p2' }, db);
    expect(result.code).toBe(1002);
  });

  it('should return 1003 if post not found', async () => {
    const result = await handleDeletePost({ openid: 'author_1', postId: 'nonexistent' }, db);
    expect(result.code).toBe(1003);
  });

  it('should return 1001 if postId missing', async () => {
    const result = await handleDeletePost({ openid: 'author_1' }, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleUpdatePost', () => {
  let db;

  beforeEach(() => {
    db = createMockDb();
    db.store.posts = [
      {
        _id: 'p1', authorId: 'author_1', title: '原标题',
        content: '原内容，足够长了吧应该有十个字了', category: 'recovery',
        status: 'normal', images: []
      },
      { _id: 'p2', authorId: 'author_2', title: '别人帖子', content: '内容', status: 'normal' }
    ];
  });

  it('should update title of own post', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      title: '新标题'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.posts[0].title).toBe('新标题');
  });

  it('should update content of own post', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      content: '这是更新后的内容，已经超过十个字了'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.posts[0].content).toBe('这是更新后的内容，已经超过十个字了');
  });

  it('should update category of own post', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      category: 'bci'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.posts[0].category).toBe('bci');
  });

  it('should return 1002 if updating another users post', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p2',
      title: '想改别人的'
    }, db);

    expect(result.code).toBe(1002);
  });

  it('should return 1003 if post not found', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'nonexistent',
      title: '不存在'
    }, db);

    expect(result.code).toBe(1003);
  });

  it('should return 1001 if postId missing', async () => {
    const result = await handleUpdatePost({ openid: 'author_1' }, db);
    expect(result.code).toBe(1001);
  });

  it('should return 1001 if empty title', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      title: '  '
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should return 1001 if content too short', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      content: '太短'
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should return 1001 if content too long', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      content: '字'.repeat(5001)
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should return 1001 if invalid category', async () => {
    const result = await handleUpdatePost({
      openid: 'author_1',
      postId: 'p1',
      category: 'invalid'
    }, db);

    expect(result.code).toBe(1001);
  });
});
