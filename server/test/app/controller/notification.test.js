'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('NotificationController', () => {
  let token;
  let userId;

  before(async () => {
    await app.model.sync({ force: true });
  });

  beforeEach(async () => {
    const reg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'notifuser', email: `notif${Date.now()}@test.com`, password: 'password123' });
    token = reg.body.data.token;
    userId = reg.body.data.user.id;
  });

  afterEach(async () => {
    await app.model.Notification.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/notifications', () => {
    it('should list user notifications', async () => {
      await app.model.Notification.create({
        userId,
        type: 'system',
        title: 'Welcome',
        content: 'Welcome to NaoBridge!',
        isRead: false,
      });

      const res = await app.httpRequest()
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.rows.length === 1);
      assert(res.body.data.rows[0].title === 'Welcome');
    });

    it('should reject unauthenticated request', async () => {
      await app.httpRequest()
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('PUT /api/v1/notifications/:notificationId/read', () => {
    it('should mark notification as read', async () => {
      const notif = await app.model.Notification.create({
        userId,
        type: 'comment',
        title: 'New Comment',
        content: 'Someone commented on your post',
        isRead: false,
      });

      const res = await app.httpRequest()
        .put(`/api/v1/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.isRead === true);
    });

    it('should reject marking other user notification', async () => {
      const other = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'other', email: `other${Date.now()}@test.com`, password: 'password123' });

      const notif = await app.model.Notification.create({
        userId: other.body.data.user.id,
        type: 'system',
        title: 'Not yours',
        content: 'This belongs to another user',
        isRead: false,
      });

      await app.httpRequest()
        .put(`/api/v1/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      await app.model.Notification.bulkCreate([
        { userId, type: 'system', title: 'N1', content: 'C1', isRead: false },
        { userId, type: 'system', title: 'N2', content: 'C2', isRead: false },
        { userId, type: 'system', title: 'N3', content: 'C3', isRead: false },
      ]);

      const res = await app.httpRequest()
        .put('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.updated === 3);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count', async () => {
      await app.model.Notification.bulkCreate([
        { userId, type: 'system', title: 'N1', content: 'C1', isRead: false },
        { userId, type: 'system', title: 'N2', content: 'C2', isRead: true },
        { userId, type: 'system', title: 'N3', content: 'C3', isRead: false },
      ]);

      const res = await app.httpRequest()
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.count === 2);
    });

    it('should return 0 when no unread notifications', async () => {
      const res = await app.httpRequest()
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.data.count === 0);
    });
  });

  describe('GET /api/v1/notifications (pagination)', () => {
    it('should paginate notifications', async () => {
      for (let i = 0; i < 5; i++) {
        await app.model.Notification.create({
          userId,
          type: 'system',
          title: `Notif ${i}`,
          content: `Content ${i}`,
          isRead: false,
        });
      }

      const res = await app.httpRequest()
        .get('/api/v1/notifications?page=1&page_size=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.data.rows.length === 2);
      assert(res.body.data.count === 5);
      assert(res.body.data.page === 1);
      assert(res.body.data.pageSize === 2);
    });
  });

  describe('PUT /api/v1/notifications/:notificationId/read (edge cases)', () => {
    it('should return 404 for non-existent notification', async () => {
      await app.httpRequest()
        .put('/api/v1/notifications/99999/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
