/**
 * Comment Handlers — pure business logic
 */
const { createFilter, filterText } = require('../sensitive-filter/filter');

const MAX_COMMENT_LENGTH = 500;

/**
 * Check user write access (shared pattern)
 */
async function checkUserAccess(openid, db) {
  const { data: users } = await db.collection('users').where({ _openid: openid }).get();
  if (users.length === 0) return { allowed: false, code: 1003, message: '用户不存在' };

  const user = users[0];
  if (user.status === 'banned') return { allowed: false, code: 1002, message: '您的账号已被封禁' };
  if (user.status === 'muted') {
    const expiry = user.muteExpiry ? new Date(user.muteExpiry) : null;
    if (expiry && expiry > new Date()) {
      return { allowed: false, code: 1002, message: '您的账号已被禁言，暂时无法操作' };
    }
  }
  return { allowed: true, user };
}

/**
 * Create a comment or reply
 */
async function handleCreateComment(params, db) {
  const { openid, postId, content, parentId = null } = params || {};

  if (!openid) return { code: 1001, data: null, message: '缺少必要参数：openid' };
  if (!postId) return { code: 1001, data: null, message: '缺少必要参数：postId' };

  if (!content || !content.trim()) {
    return { code: 1001, data: null, message: '评论内容不能为空' };
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return { code: 1001, data: null, message: `评论内容不能超过${MAX_COMMENT_LENGTH}个字` };
  }

  // Check user access
  const access = await checkUserAccess(openid, db);
  if (!access.allowed) return { code: access.code, data: null, message: access.message };

  // Check post exists and comments enabled
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

  if (!post.commentEnabled) {
    return { code: 1002, data: null, message: '帖主已关闭评论' };
  }

  // Validate parentId if provided
  if (parentId) {
    try {
      const parentResult = await db.collection('comments').doc(parentId).get();
      if (parentResult.data.postId !== postId) {
        return { code: 1001, data: null, message: '回复的评论不属于该帖子' };
      }
    } catch (err) {
      return { code: 1003, data: null, message: '回复的评论不存在' };
    }
  }

  // Sensitive word check
  const { data: wordRecords } = await db.collection('sensitive_words').where({}).limit(1000).get();
  const words = wordRecords.map(r => r.word);
  const filter = createFilter(words);
  const check = filterText(filter, content);

  if (!check.safe) {
    return { code: 1004, data: null, message: '评论包含敏感词，请修改后重试' };
  }

  const now = new Date().toISOString();
  const newComment = {
    postId,
    authorId: openid,
    authorName: access.user.nickName,
    authorAvatar: access.user.avatarUrl || '',
    content: content.trim(),
    parentId: parentId || null,
    status: 'normal',
    createdAt: now
  };

  const { _id } = await db.collection('comments').add({ data: newComment });

  // Increment post commentCount
  await db.collection('posts').doc(postId).update({
    data: { commentCount: post.commentCount + 1 }
  });

  return {
    code: 0,
    data: { commentId: _id },
    message: ''
  };
}

/**
 * Get comments for a post (with nested replies)
 */
async function handleGetCommentList(params, db) {
  const { postId } = params || {};

  if (!postId) return { code: 1001, data: null, message: '缺少必要参数：postId' };

  // Get all normal comments for this post
  const { data: allComments } = await db
    .collection('comments')
    .where({ postId, status: 'normal' })
    .orderBy('createdAt', 'asc')
    .limit(500)
    .get();

  // Separate top-level and replies
  const topLevel = [];
  const repliesByParent = {};

  for (const comment of allComments) {
    if (!comment.parentId) {
      topLevel.push({ ...comment, replies: [] });
    } else {
      if (!repliesByParent[comment.parentId]) {
        repliesByParent[comment.parentId] = [];
      }
      repliesByParent[comment.parentId].push(comment);
    }
  }

  // Attach replies to parents
  for (const comment of topLevel) {
    comment.replies = repliesByParent[comment._id] || [];
  }

  return {
    code: 0,
    data: { comments: topLevel },
    message: ''
  };
}

/**
 * Soft-delete a comment (owner or post author)
 */
async function handleDeleteComment(params, db) {
  const { openid, commentId } = params || {};

  if (!commentId) return { code: 1001, data: null, message: '缺少必要参数：commentId' };

  let comment;
  try {
    const result = await db.collection('comments').doc(commentId).get();
    comment = result.data;
  } catch (err) {
    return { code: 1003, data: null, message: '评论不存在' };
  }

  // Check permission: comment author or post author
  const isCommentAuthor = comment.authorId === openid;

  let isPostAuthor = false;
  if (!isCommentAuthor) {
    try {
      const postResult = await db.collection('posts').doc(comment.postId).get();
      isPostAuthor = postResult.data.authorId === openid;
    } catch (err) {
      // Post not found — still allow comment author to delete
    }
  }

  if (!isCommentAuthor && !isPostAuthor) {
    return { code: 1002, data: null, message: '只能删除自己的评论' };
  }

  await db.collection('comments').doc(commentId).update({
    data: { status: 'deleted', updatedAt: new Date().toISOString() }
  });

  // Decrement post commentCount
  try {
    const postResult = await db.collection('posts').doc(comment.postId).get();
    const post = postResult.data;
    await db.collection('posts').doc(comment.postId).update({
      data: { commentCount: Math.max(0, post.commentCount - 1) }
    });
  } catch (err) {
    // Post may have been deleted
  }

  return { code: 0, data: null, message: '' };
}

module.exports = {
  handleCreateComment,
  handleGetCommentList,
  handleDeleteComment
};
