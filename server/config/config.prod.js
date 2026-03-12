'use strict';

module.exports = () => {
  const config = {};

  // Validate required environment variables
  const required = ['MYSQL_USERNAME', 'MYSQL_PASSWORD', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Cloud Hosting provides MYSQL_ADDRESS as "host:port"
  const mysqlAddress = process.env.MYSQL_ADDRESS || 'localhost:3306';
  const [mysqlHost, mysqlPort] = mysqlAddress.split(':');

  config.sequelize = {
    dialect: 'mysql',
    database: process.env.MYSQL_DBNAME || 'naobridge',
    host: mysqlHost,
    port: mysqlPort || '3306',
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
  };

  // Cloud Hosting provides REDIS_ADDRESS as "host:port"
  const redisAddress = process.env.REDIS_ADDRESS || '127.0.0.1:6379';
  const [redisHost, redisPort] = redisAddress.split(':');

  config.redis = {
    client: {
      host: redisHost,
      port: redisPort || '6379',
      password: process.env.REDIS_PASSWORD || '',
      db: '0',
    },
  };

  config.jwt = {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  };

  // WeChat Mini Program credentials
  config.wechat = {
    appId: process.env.WX_APPID || '',
    appSecret: process.env.WX_APPSECRET || '',
  };

  return config;
};
