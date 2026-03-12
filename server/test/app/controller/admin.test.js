'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('AdminController', () => {
  let adminToken;
  let adminUserId;
  let userToken;
  let regularUserId;

  before(async () => {
    await app.model.sync({ force: true });
  });

  beforeEach(async () => {
    // Register admin user
    const adminReg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'admin', email: `admin${Date.now()}@test.com`, password: 'password123' });
    adminToken = adminReg.body.data.token;
    adminUserId = adminReg.body.data.user.id;

    // Add admin record
    await app.model.Admin.create({ userId: adminUserId, level: 'super' });

    // Register regular user
    const userReg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'regular', email: `regular${Date.now()}@test.com`, password: 'password123' });
    userToken = userReg.body.data.token;
    regularUserId = userReg.body.data.user.id;
  });

  afterEach(async () => {
    await app.model.PostComment.destroy({ where: {}, force: true });
    await app.model.PostLike.destroy({ where: {}, force: true });
    await app.model.PostImage.destroy({ where: {}, force: true });
    await app.model.Favorite.destroy({ where: {}, force: true });
    await app.model.PostFeedback.destroy({ where: {}, force: true });
    await app.model.Post.destroy({ where: {}, force: true });
    await app.model.Notification.destroy({ where: {}, force: true });
    await app.model.SensitiveWord.destroy({ where: {}, force: true });
    await app.model.Admin.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.UserFollow.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return stats for admin', async () => {
      const res = await app.httpRequest()
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(typeof res.body.data.users === 'number');
      assert(typeof res.body.data.posts === 'number');
      assert(typeof res.body.data.comments === 'number');
      assert(typeof res.body.data.pendingReports === 'number');
    });

    it('should reject non-admin', async () => {
      await app.httpRequest()
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should reject unauthenticated', async () => {
      await app.httpRequest()
        .get('/api/v1/admin/stats')
        .expect(401);
    });
  });

  describe('POST /api/v1/admin/users/:userId/mute', () => {
    it('should mute a user', async () => {
      const res = await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/mute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ duration: 7 })
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.status === 'muted');
    });

    it('should reject mute by non-admin', async () => {
      await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/mute`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ duration: 7 })
        .expect(403);
    });

    it('should reject missing duration', async () => {
      await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/mute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('POST /api/v1/admin/users/:userId/ban', () => {
    it('should ban a user', async () => {
      const res = await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.status === 'banned');
    });
  });

  describe('POST /api/v1/admin/users/:userId/unmute', () => {
    it('should unmute a muted user', async () => {
      // Mute first
      await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/mute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ duration: 7 });

      // Unmute
      const res = await app.httpRequest()
        .post(`/api/v1/admin/users/${regularUserId}/unmute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.status === 'normal');
    });
  });

  describe('Sensitive word management', () => {
    it('should add a sensitive word', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/admin/words')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: '诈骗', category: 'fraud' })
        .expect(201);

      assert(res.body.code === 0);
      assert(res.body.data.word === '诈骗');
    });

    it('should reject duplicate word', async () => {
      await app.httpRequest()
        .post('/api/v1/admin/words')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: 'dupword', category: 'ad' });

      await app.httpRequest()
        .post('/api/v1/admin/words')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: 'dupword', category: 'ad' })
        .expect(409);
    });

    it('should remove a sensitive word', async () => {
      const added = await app.httpRequest()
        .post('/api/v1/admin/words')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: 'todelete', category: 'violence' });

      const wordId = added.body.data.id;

      await app.httpRequest()
        .delete(`/api/v1/admin/words/${wordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject removing non-existent word', async () => {
      await app.httpRequest()
        .delete('/api/v1/admin/words/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/reports', () => {
    it('should list reports', async () => {
      // Create a post and report it
      const post = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Bad Post', content: 'Some bad content that needs reporting', category: 'free' });

      await app.httpRequest()
        .post(`/api/v1/posts/${post.body.data.post.id}/report`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'harassment' });

      const res = await app.httpRequest()
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.rows.length >= 1);
    });
  });

  describe('GET /api/v1/admin/content', () => {
    it('should list posts for moderation', async () => {
      await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'A Post', content: 'Post content for moderation review', category: 'free' });

      const res = await app.httpRequest()
        .get('/api/v1/admin/content?type=posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.rows.length >= 1);
    });

    it('should list comments for moderation', async () => {
      const res = await app.httpRequest()
        .get('/api/v1/admin/content?type=comments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(Array.isArray(res.body.data.rows));
    });

    it('should reject invalid content type', async () => {
      await app.httpRequest()
        .get('/api/v1/admin/content?type=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/admin/reports/:reportId/review', () => {
    it('should review and process a report', async () => {
      // Create a post and report
      const post = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Reported Post', content: 'Content that will be reported by test', category: 'free' });

      const report = await app.httpRequest()
        .post(`/api/v1/posts/${post.body.data.post.id}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'medical-fraud' });

      const reportId = report.body.data.id;

      const res = await app.httpRequest()
        .post(`/api/v1/admin/reports/${reportId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'delete', result: 'Content removed' })
        .expect(200);

      assert(res.body.code === 0);
    });
  });
});
