'use strict';

module.exports = () => {
  const config = {};

  config.sequelize = {
    dialect: 'mysql',
    database: 'tftime',
    host: 'localhost',
    port: '3306',
    username: 'eggapp',
    password: 'eggapp123',
  };

  config.redis = {
    client: {
      host: '127.0.0.1',
      port: '6379',
      password: '',
      db: '0',
    },
  };

  config.jwt = {
    secret: 'k8sJ3mZ9xQ2wR7nP4vL6cB1hF5tY0uA',
    expiresIn: '7d',
  };

  return config;
};
