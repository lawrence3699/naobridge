'use strict';

module.exports = appInfo => {
  const config = {};

  config.keys = appInfo.name + '_naobridge_2026_secret';

  config.middleware = ['errorHandler'];

  config.redis = {
    client: {
      host: '127.0.0.1',
      port: '6379',
      password: '',
      db: '0',
    },
  };

  config.sequelize = {
    dialect: 'mysql',
    database: 'tftime',
    host: 'localhost',
    port: '3306',
    username: 'root',
    password: '',
    define: {
      freezeTableName: false,
      underscored: false,
    },
  };

  config.jwt = {
    secret: process.env.JWT_SECRET || 'naobridge-dev-secret-change-in-prod',
    expiresIn: '7d',
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  // WeChat Mini Program (dev defaults)
  config.wechat = {
    appId: process.env.WX_APPID || '',
    appSecret: process.env.WX_APPSECRET || '',
  };

  // NaoBridge specific
  config.naobridge = {
    maxPostsPerDay: 10,
    maxCommentsPerDay: 50,
    maxImagesPerPost: 9,
    maxContentLength: 5000,
    minContentLength: 10,
    maxCommentLength: 500,
    maxNicknameLength: 20,
  };

  return config;
};
