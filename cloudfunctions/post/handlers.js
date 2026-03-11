/**
 * Post Handlers — pure business logic
 * All handlers accept (params, db) for dependency injection
 */
const { createFilter, filterText } = require('../sensitive-filter/filter');

const VALID_CATEGORIES = ['recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'];
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 5000;
const MAX_IMAGES = 9;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Check if user can perform write actions
 */
async function checkUserWriteAccess(openid, db) {
  const { data: users } = await db.collection('users').where({ _openid: openid }).get();

  if (users.length === 0) {
    return { allowed: false, code: 1003, message: '用户不存在' };
  }

  const user = users[0];

  if (user.status === 'banned') {
    return { allowed: false, code: 1002, message: '您的账号已被封禁' };
  }

  if (user.status === 'muted') {
    const muteExpiry = user.muteExpiry ? new Date(user.muteExpiry) : null;
    if (muteExpiry && muteExpiry > new Date()) {
      return { allowed: false, code: 1002, message: '您的账号已被禁言，暂时无法操作' };
    }
  }

  return { allowed: true, user };
}

/**
 * Load sensitive words and build filter
 */
async function loadSensitiveFilter(db) {
  const { data: wordRecords } = await db
    .collection('sensitive_words')
    .where({})
    .limit(1000)
    .get();

  const words = wordRecords.map(r => r.word);
  return createFilter(words);
}

/**
 * Check text against sensitive filter
 */
function checkSensitive(filter, text) {
  return filterText(filter, text);
}

/**
 * Create a new post
 */
async function handleCreatePost(params, db) {
  const { openid, title, content, category, images = [] } = params || {};

  if (!openid) {
    return { code: 1001, data: null, message: '缺少必要参数：openid' };
  }

  // Validate required fields
  if (!title || !title.trim()) {
    return { code: 1001, data: null, message: '请填写标题' };
  }

  if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
    return { code: 1001, data: null, message: `正文内容不能少于${MIN_CONTENT_LENGTH}个字` };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { code: 1001, data: null, message: `正文内容不能超过${MAX_CONTENT_LENGTH}个字` };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return { code: 1001, data: null, message: '请选择有效的分类标签' };
  }

  if (images.length > MAX_IMAGES) {
    return { code: 1001, data: null, message: `最多上传${MAX_IMAGES}张图片` };
  }

  // Check user access
  const access = await checkUserWriteAccess(openid, db);
  if (!access.allowed) {
    return { code: access.code, data: null, message: access.message };
  }

  // Sensitive word check
  const filter = await loadSensitiveFilter(db);

  const titleCheck = checkSensitive(filter, title);
  if (!titleCheck.safe) {
    return { code: 1004, data: null, message: '标题包含敏感词，请修改后重试' };
  }

  const contentCheck = checkSensitive(filter, content);
  if (!contentCheck.safe) {
    return { code: 1004, data: null, message: '正文包含敏感词，请修改后重试' };
  }

  const now = new Date().toISOString();
  const newPost = {
    authorId: openid,
    authorName: access.user.nickName,
    authorAvatar: access.user.avatarUrl || '',
    title: title.trim(),
    content,
    images,
    category,
    status: 'normal',
    commentEnabled: true,
    isPinned: false,
    isFeatured: false,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now
  };

  const { _id } = await db.collection('posts').add({ data: newPost });

  return {
    code: 0,
    data: { postId: _id },
    message: ''
  };
}

/**
 * Get paginated post list with optional category filter
 */
async function handleGetPostList(params, db) {
  const { category, page = 1, pageSize: rawPageSize = DEFAULT_PAGE_SIZE } = params || {};
  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  const query = { status: 'normal' };
  if (category && VALID_CATEGORIES.includes(category)) {
    query.category = category;
  }

  // Get total count
  const { total } = await db.collection('posts').where(query).count();

  // Get page of posts
  const skip = (page - 1) * pageSize;
  const { data: posts } = await db
    .collection('posts')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return {
    code: 0,
    data: {
      posts,
      pagination: {
        page,
        pageSize,
        total
      }
    },
    message: ''
  };
}

/**
 * Get single post detail with author info
 */
async function handleGetPostDetail(params, db) {
  const { postId } = params || {};

  if (!postId) {
    return { code: 1001, data: null, message: '缺少必要参数：postId' };
  }

  let post;
  try {
    const result = await db.collection('posts').doc(postId).get();
    post = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '帖子不存在' };
  }

  if (post.status !== 'normal') {
    return { code: 1003, data: null, message: '帖子不存在或已被删除' };
  }

  // Increment view count
  await db.collection('posts').doc(postId).update({
    data: { viewCount: post.viewCount + 1 }
  });

  // Fetch author info
  let author = null;
  const { data: users } = await db.collection('users').where({ _openid: post.authorId }).get();
  if (users.length > 0) {
    const { _openid, ...safeUser } = users[0];
    author = safeUser;
  }

  return {
    code: 0,
    data: { ...post, author },
    message: ''
  };
}

/**
 * Update a post (owner only)
 */
async function handleUpdatePost(params, db) {
  const { openid, postId, title, content, category } = params || {};

  if (!postId) {
    return { code: 1001, data: null, message: '缺少必要参数：postId' };
  }

  let post;
  try {
    const result = await db.collection('posts').doc(postId).get();
    post = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '帖子不存在' };
  }

  if (post.authorId !== openid) {
    return { code: 1002, data: null, message: '只能编辑自己的帖子' };
  }

  const updateData = { updatedAt: new Date().toISOString() };

  if (title !== undefined) {
    if (!title.trim()) {
      return { code: 1001, data: null, message: '标题不能为空' };
    }
    updateData.title = title.trim();
  }

  if (content !== undefined) {
    if (content.trim().length < MIN_CONTENT_LENGTH) {
      return { code: 1001, data: null, message: `正文内容不能少于${MIN_CONTENT_LENGTH}个字` };
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return { code: 1001, data: null, message: `正文内容不能超过${MAX_CONTENT_LENGTH}个字` };
    }
    updateData.content = content;
  }

  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return { code: 1001, data: null, message: '请选择有效的分类标签' };
    }
    updateData.category = category;
  }

  await db.collection('posts').doc(postId).update({ data: updateData });

  return { code: 0, data: null, message: '' };
}

/**
 * Soft-delete a post (owner only)
 */
async function handleDeletePost(params, db) {
  const { openid, postId } = params || {};

  if (!postId) {
    return { code: 1001, data: null, message: '缺少必要参数：postId' };
  }

  let post;
  try {
    const result = await db.collection('posts').doc(postId).get();
    post = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '帖子不存在' };
  }

  if (post.authorId !== openid) {
    return { code: 1002, data: null, message: '只能删除自己的帖子' };
  }

  await db.collection('posts').doc(postId).update({
    data: { status: 'deleted', updatedAt: new Date().toISOString() }
  });

  return { code: 0, data: null, message: '' };
}

module.exports = {
  handleCreatePost,
  handleGetPostList,
  handleGetPostDetail,
  handleUpdatePost,
  handleDeletePost
};
