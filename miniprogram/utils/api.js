/**
 * API utility — HTTP requests to NaoBridge Egg.js backend
 */

const BASE_URL = 'http://8.141.95.103/api/v1';

/**
 * Get stored auth token
 */
function getToken() {
  return wx.getStorageSync('auth_token') || '';
}

/**
 * Save auth token
 */
function setToken(token) {
  wx.setStorageSync('auth_token', token);
}

/**
 * Clear auth token
 */
function clearToken() {
  wx.removeStorageSync('auth_token');
}

/**
 * HTTP request with unified error handling
 * @param {string} method - GET/POST/PUT/DELETE
 * @param {string} path - API path (e.g., /posts)
 * @param {object} data - request body or query params
 * @returns {Promise<{ code: number, data: any, msg: string }>}
 */
function request(method, path, data) {
  return new Promise((resolve) => {
    const token = getToken();
    const header = { 'Content-Type': 'application/json' };
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    wx.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.data && res.data.code) {
          resolve(res.data);
        } else {
          resolve({
            code: res.data?.code || 2001,
            data: null,
            msg: res.data?.msg || res.data?.message || '请求失败'
          });
        }
      },
      fail(err) {
        console.error(`request ${method} ${path} error:`, err);
        resolve({
          code: 2001,
          data: null,
          msg: '网络请求失败，请检查网络后重试'
        });
      }
    });
  });
}

/**
 * User API
 */
const userApi = {
  register(name, role, email, password, avatarUrl) {
    return request('POST', '/register', {
      name, role, email, password, avatar: avatarUrl
    }).then(res => {
      if (res.code === 0 && res.data?.token) {
        setToken(res.data.token);
      }
      return res;
    });
  },

  login(email, password) {
    return request('POST', '/login', { email, password }).then(res => {
      if (res.code === 0 && res.data?.token) {
        setToken(res.data.token);
      }
      return res;
    });
  },

  getProfile() {
    return request('GET', '/user/me');
  },

  getUserProfile(userId) {
    return request('GET', `/users/${userId}`);
  },

  updateProfile(updates) {
    return request('PUT', '/user/me', updates);
  },

  follow(userId) {
    return request('POST', `/users/${userId}/follow`);
  },

  logout() {
    clearToken();
  }
};

/**
 * Post API
 */
const postApi = {
  create(title, content, category, images) {
    return request('POST', '/posts', { title, content, category, images });
  },

  getList(category, page, pageSize) {
    const params = {};
    if (category) params.category = category;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    return request('GET', '/posts', params);
  },

  getFeed(page, pageSize) {
    const params = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    return request('GET', '/posts/feed', params);
  },

  getDetail(postId) {
    return request('GET', `/posts/${postId}`);
  },

  update(postId, updates) {
    return request('PUT', `/posts/${postId}`, updates);
  },

  delete(postId) {
    return request('DELETE', `/posts/${postId}`);
  },

  like(postId) {
    return request('POST', `/posts/${postId}/like`);
  },

  favorite(postId) {
    return request('POST', `/posts/${postId}/favorite`);
  },

  report(postId, reason, description) {
    return request('POST', `/posts/${postId}/report`, {
      targetType: 'post',
      targetId: postId,
      reason,
      description
    });
  }
};

/**
 * Comment API
 */
const commentApi = {
  create(postId, content) {
    return request('POST', `/posts/${postId}/comments`, { content });
  },

  reply(postId, commentId, content) {
    return request('POST', `/posts/${postId}/comments/${commentId}/reply`, { content });
  },

  like(postId, commentId) {
    return request('POST', `/posts/${postId}/comments/${commentId}/like`);
  },

  delete(postId, commentId) {
    return request('DELETE', `/posts/${postId}/comments/${commentId}`);
  }
};

/**
 * Report API
 */
const reportApi = {
  create(targetType, targetId, reason, description) {
    // Reports go through the post report endpoint for posts
    // For comments/users, use the generic structure
    return request('POST', `/posts/${targetId}/report`, {
      targetType, targetId, reason, description
    });
  },

  getMyReports() {
    // Not yet implemented as separate endpoint
    return Promise.resolve({ code: 0, data: { reports: [] }, msg: 'ok' });
  }
};

/**
 * Notification API
 */
const notificationApi = {
  getList(page, pageSize) {
    const params = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    return request('GET', '/notifications', params);
  },

  markRead(notificationId) {
    return request('PUT', `/notifications/${notificationId}/read`);
  },

  markAllRead() {
    return request('PUT', '/notifications/read-all');
  },

  getUnreadCount() {
    return request('GET', '/notifications/unread-count');
  }
};

/**
 * Admin API
 */
const adminApi = {
  getStats() {
    return request('GET', '/admin/stats');
  },

  reviewReport(reportId, action, resultNote) {
    return request('POST', `/admin/reports/${reportId}/review`, { action, resultNote });
  },

  muteUser(userId, duration) {
    return request('POST', `/admin/users/${userId}/mute`, { duration });
  },

  banUser(userId) {
    return request('POST', `/admin/users/${userId}/ban`);
  },

  unmuteUser(userId) {
    return request('POST', `/admin/users/${userId}/unmute`);
  },

  addWord(word, category) {
    return request('POST', '/admin/words', { word, category });
  },

  removeWord(wordId) {
    return request('DELETE', `/admin/words/${wordId}`);
  },

  getReportList(status, page, pageSize) {
    const params = {};
    if (status) params.status = status;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    return request('GET', '/admin/reports', params);
  },

  getContentList(type, page, pageSize) {
    const params = {};
    if (type) params.type = type;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    return request('GET', '/admin/content', params);
  }
};

module.exports = {
  request,
  getToken,
  setToken,
  clearToken,
  userApi,
  postApi,
  commentApi,
  reportApi,
  notificationApi,
  adminApi
};
