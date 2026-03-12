'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('ChannelController', () => {

  before(async () => {
    await app.model.sync({ force: true });
  });

  afterEach(async () => {
    await app.model.Channel.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/channels', () => {
    it('should list all channels', async () => {
      await app.model.Channel.bulkCreate([
        { name: 'General', description: 'General discussion' },
        { name: 'Recovery', description: 'Recovery stories' },
      ]);

      const res = await app.httpRequest()
        .get('/api/v1/channels')
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.length === 2);
    });

    it('should return empty array when no channels', async () => {
      const res = await app.httpRequest()
        .get('/api/v1/channels')
        .expect(200);

      assert(res.body.data.length === 0);
    });
  });

  describe('GET /api/v1/channels/:channelId', () => {
    it('should show a single channel', async () => {
      const channel = await app.model.Channel.create({
        name: 'Test Channel',
        description: 'A test channel',
      });

      const res = await app.httpRequest()
        .get(`/api/v1/channels/${channel.id}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.name === 'Test Channel');
    });

    it('should return 404 for non-existent channel', async () => {
      await app.httpRequest()
        .get('/api/v1/channels/99999')
        .expect(404);
    });
  });
});
