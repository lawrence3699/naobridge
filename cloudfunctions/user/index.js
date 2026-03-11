/**
 * User Cloud Function — entry point
 * Routes to handlers based on action parameter
 */
const {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile
} = require('./handlers');

exports.main = async (event, context) => {
  try {
    const cloud = require('wx-server-sdk');
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = cloud.database();

    const { OPENID } = cloud.getWXContext();
    const { action, ...params } = event;

    // Inject authenticated openid
    const paramsWithAuth = { ...params, openid: OPENID };

    switch (action) {
      case 'login':
        return await handleLogin(paramsWithAuth, db);
      case 'register':
        return await handleRegister(paramsWithAuth, db);
      case 'getProfile':
        return await handleGetProfile(paramsWithAuth, db);
      case 'updateProfile':
        return await handleUpdateProfile(paramsWithAuth, db);
      default:
        return {
          code: 1001,
          data: null,
          message: `未知操作：${action}`
        };
    }
  } catch (error) {
    console.error('user cloud function error:', error);
    return {
      code: 2001,
      data: null,
      message: '服务器内部错误，请稍后重试'
    };
  }
};
