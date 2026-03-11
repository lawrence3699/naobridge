/**
 * API utility — wraps wx.cloud.callFunction for consistent error handling
 */

/**
 * Call a cloud function with unified error handling
 * @param {string} name - cloud function name
 * @param {object} data - parameters
 * @returns {Promise<{ code: number, data: any, message: string }>}
 */
async function callFunction(name, data) {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    return res.result;
  } catch (error) {
    console.error(`callFunction ${name} error:`, error);
    return {
      code: 2001,
      data: null,
      message: '网络请求失败，请检查网络后重试'
    };
  }
}

/**
 * User API
 */
const userApi = {
  login() {
    return callFunction('user', { action: 'login' });
  },

  register(nickName, role, avatarUrl) {
    return callFunction('user', { action: 'register', nickName, role, avatarUrl });
  },

  getProfile() {
    return callFunction('user', { action: 'getProfile' });
  },

  updateProfile(updates) {
    return callFunction('user', { action: 'updateProfile', ...updates });
  }
};

/**
 * Post API
 */
const postApi = {
  create(title, content, category, images) {
    return callFunction('post', { action: 'create', title, content, category, images });
  },

  getList(category, page, pageSize) {
    return callFunction('post', { action: 'list', category, page, pageSize });
  },

  getDetail(postId) {
    return callFunction('post', { action: 'detail', postId });
  },

  update(postId, updates) {
    return callFunction('post', { action: 'update', postId, ...updates });
  },

  delete(postId) {
    return callFunction('post', { action: 'delete', postId });
  }
};

/**
 * Comment API
 */
const commentApi = {
  create(postId, content, parentId) {
    return callFunction('comment', { action: 'create', postId, content, parentId });
  },

  getList(postId) {
    return callFunction('comment', { action: 'list', postId });
  },

  delete(commentId) {
    return callFunction('comment', { action: 'delete', commentId });
  }
};

/**
 * Report API
 */
const reportApi = {
  create(targetType, targetId, reason, description) {
    return callFunction('report', { action: 'create', targetType, targetId, reason, description });
  },

  getMyReports() {
    return callFunction('report', { action: 'myReports' });
  }
};

/**
 * Content Security API
 */
const contentApi = {
  checkText(text, scene) {
    return callFunction('sensitive-filter', { text, scene });
  }
};

module.exports = {
  callFunction,
  userApi,
  postApi,
  commentApi,
  reportApi,
  contentApi
};
