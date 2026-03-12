'use strict';

const { app } = require('egg-mock/bootstrap');

before(async () => {
  await app.ready();
  // Sync all models to SQLite in-memory DB
  await app.model.sync({ force: true });
});
