/**
 * Post Cloud Function — entry point
 */
const {
  handleCreatePost,
  handleGetPostList,
  handleGetPostDetail,
  handleUpdatePost,
  handleDeletePost
} = require('./handlers');

exports.main = async (event, context) => {
  try {
    const cloud = require('wx-server-sdk');
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = cloud.database();

    const { OPENID } = cloud.getWXContext();
    const { action, ...params } = event;

    const paramsWithAuth = { ...params, openid: OPENID };

    switch (action) {
      case 'create':
        return await handleCreatePost(paramsWithAuth, db);
      case 'list':
        return await handleGetPostList(params, db);
      case 'detail':
        return await handleGetPostDetail(params, db);
      case 'update':
        return await handleUpdatePost(paramsWithAuth, db);
      case 'delete':
        return await handleDeletePost(paramsWithAuth, db);
      default:
        return { code: 1001, data: null, message: `未知操作：${action}` };
    }
  } catch (error) {
    console.error('post cloud function error:', error);
    return { code: 2001, data: null, message: '服务器内部错误，请稍后重试' };
  }
};
