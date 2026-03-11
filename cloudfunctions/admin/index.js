/**
 * Admin Cloud Function — entry point
 */
const {
  handleGetStats,
  handleReviewReport,
  handleMuteUser,
  handleBanUser,
  handleUnmuteUser,
  handleAddSensitiveWord,
  handleRemoveSensitiveWord,
  handleGetReportList,
  handleGetContentList
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
      case 'stats':
        return await handleGetStats(paramsWithAuth, db);
      case 'reviewReport':
        return await handleReviewReport(paramsWithAuth, db);
      case 'muteUser':
        return await handleMuteUser(paramsWithAuth, db);
      case 'banUser':
        return await handleBanUser(paramsWithAuth, db);
      case 'unmuteUser':
        return await handleUnmuteUser(paramsWithAuth, db);
      case 'addWord':
        return await handleAddSensitiveWord(paramsWithAuth, db);
      case 'removeWord':
        return await handleRemoveSensitiveWord(paramsWithAuth, db);
      case 'reportList':
        return await handleGetReportList(paramsWithAuth, db);
      case 'contentList':
        return await handleGetContentList(paramsWithAuth, db);
      default:
        return { code: 1001, data: null, message: `未知操作：${action}` };
    }
  } catch (error) {
    console.error('admin cloud function error:', error);
    return { code: 2001, data: null, message: '服务器内部错误，请稍后重试' };
  }
};
