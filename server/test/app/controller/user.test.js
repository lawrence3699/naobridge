'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('UserController', () => {

  before(async () => {
    await app.model.sync({ force: true });
  });

  afterEach(async () => {
    await app.model.PostComment.destroy({ where: {}, force: true });
    await app.model.PostLike.destroy({ where: {}, force: true });
    await app.model.PostImage.destroy({ where: {}, force: true });
    await app.model.Favorite.destroy({ where: {}, force: true });
    await app.model.Post.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.UserFollow.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
  });

  describe('POST /api/v1/register', () => {
    it('should register a new user', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/register')
        .send({
          name: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201);

      assert(res.body.code === 0);
      assert(res.body.data.user);
      assert(res.body.data.token);
      assert(res.body.data.user.name === 'testuser');
      assert(res.body.data.user.email === 'test@example.com');
      assert(!res.body.data.user.password);
    });

    it('should register with role', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/register')
        .send({
          name: 'patient1',
          email: 'patient@example.com',
          password: 'password123',
          role: 'patient',
        })
        .expect(201);

      assert(res.body.data.user.role === 'patient');
    });

    it('should default role to supporter', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/register')
        .send({
          name: 'user2',
          email: 'user2@example.com',
          password: 'password123',
        })
        .expect(201);

      assert(res.body.data.user.role === 'supporter');
    });

    it('should reject duplicate email', async () => {
      await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'u1', email: 'dup@example.com', password: 'password123' })
        .expect(201);

      const res = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'u2', email: 'dup@example.com', password: 'password123' })
        .expect(409);

      assert(res.body.code === 1001);
    });

    it('should reject missing name', async () => {
      await app.httpRequest()
        .post('/api/v1/register')
        .send({ email: 'no@name.com', password: 'password123' })
        .expect(422);
    });

    it('should reject missing email', async () => {
      await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'noEmail', password: 'password123' })
        .expect(422);
    });

    it('should reject short password', async () => {
      await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'test', email: 'short@pw.com', password: '12345' })
        .expect(422);
    });
  });

  describe('POST /api/v1/login', () => {
    beforeEach(async () => {
      await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'loginuser', email: 'login@example.com', password: 'password123' });
    });

    it('should login with correct credentials', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/login')
        .send({ email: 'login@example.com', password: 'password123' })
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.user);
      assert(res.body.data.token);
      assert(!res.body.data.user.password);
    });

    it('should reject wrong password', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' })
        .expect(401);

      assert(res.body.code === 1002);
    });

    it('should reject non-existent email', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/login')
        .send({ email: 'nope@example.com', password: 'password123' })
        .expect(401);

      assert(res.body.code === 1002);
    });

    it('should reject missing fields', async () => {
      await app.httpRequest()
        .post('/api/v1/login')
        .send({ email: 'login@example.com' })
        .expect(422);
    });
  });

  describe('GET /api/v1/user/me', () => {
    it('should return current user profile', async () => {
      const reg = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'meuser', email: 'me@example.com', password: 'password123' });

      const token = reg.body.data.token;

      const res = await app.httpRequest()
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.name === 'meuser');
      assert(typeof res.body.data.followersCount === 'number');
      assert(typeof res.body.data.followingsCount === 'number');
      assert(typeof res.body.data.postsCount === 'number');
    });

    it('should reject unauthenticated request', async () => {
      await app.httpRequest()
        .get('/api/v1/user/me')
        .expect(401);
    });
  });

  describe('PUT /api/v1/user/me', () => {
    it('should update user profile', async () => {
      const reg = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'updateme', email: 'update@example.com', password: 'password123' });

      const token = reg.body.data.token;

      const res = await app.httpRequest()
        .put('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'newname' })
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.name === 'newname');
    });
  });

  describe('GET /api/v1/users/:userId', () => {
    it('should get public user profile', async () => {
      const reg = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'publicuser', email: 'public@example.com', password: 'password123' });

      const userId = reg.body.data.user.id;

      const res = await app.httpRequest()
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.name === 'publicuser');
    });

    it('should return 404 for non-existent user', async () => {
      await app.httpRequest()
        .get('/api/v1/users/99999')
        .expect(404);
    });
  });

  describe('POST /api/v1/users/:userId/follow', () => {
    it('should toggle follow/unfollow', async () => {
      const reg1 = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'follower', email: 'follower@example.com', password: 'password123' });
      const reg2 = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'followed', email: 'followed@example.com', password: 'password123' });

      const token1 = reg1.body.data.token;
      const userId2 = reg2.body.data.user.id;

      // Follow
      const follow = await app.httpRequest()
        .post(`/api/v1/users/${userId2}/follow`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      assert(follow.body.data.followed === true);

      // Unfollow
      const unfollow = await app.httpRequest()
        .post(`/api/v1/users/${userId2}/follow`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      assert(unfollow.body.data.followed === false);
    });

    it('should reject following yourself', async () => {
      const reg = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'selffollow', email: 'self@example.com', password: 'password123' });

      const userId = reg.body.data.user.id;

      await app.httpRequest()
        .post(`/api/v1/users/${userId}/follow`)
        .set('Authorization', `Bearer ${reg.body.data.token}`)
        .expect(400);
    });
  });
});
