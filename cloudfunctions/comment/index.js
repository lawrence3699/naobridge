/**
 * Comment Cloud Function — entry point
 */
const {
  handleCreateComment,
  handleGetCommentList,
  handleDeleteComment
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
        return await handleCreateComment(paramsWithAuth, db);
      case 'list':
        return await handleGetCommentList(params, db);
      case 'delete':
        return await handleDeleteComment(paramsWithAuth, db);
      default:
        return { code: 1001, data: null, message: `未知操作：${action}` };
    }
  } catch (error) {
    console.error('comment cloud function error:', error);
    return { code: 2001, data: null, message: '服务器内部错误，请稍后重试' };
  }
};
