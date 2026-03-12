'use strict';

module.exports = () => {
  const config = {};

  config.sequelize = {
    dialect: 'sqlite',
    storage: ':memory:',
    define: {
      freezeTableName: false,
      underscored: false,
    },
    logging: false,
  };

  config.redis = {
    client: {
      host: '127.0.0.1',
      port: '6379',
      password: '',
      db: '1',
    },
  };

  return config;
};
