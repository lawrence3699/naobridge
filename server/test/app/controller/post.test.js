'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('PostController', () => {
  let token;
  let userId;

  before(async () => {
    await app.model.sync({ force: true });
  });

  beforeEach(async () => {
    // Register a test user and get token
    const reg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'poster', email: `poster${Date.now()}@test.com`, password: 'password123' });
    token = reg.body.data.token;
    userId = reg.body.data.user.id;
  });

  afterEach(async () => {
    await app.model.PostComment.destroy({ where: {}, force: true });
    await app.model.PostLike.destroy({ where: {}, force: true });
    await app.model.PostImage.destroy({ where: {}, force: true });
    await app.model.Favorite.destroy({ where: {}, force: true });
    await app.model.PostFeedback.destroy({ where: {}, force: true });
    await app.model.Post.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.UserFollow.destroy({ where: {}, force: true });
    await app.model.Notification.destroy({ where: {}, force: true });
    await app.model.SensitiveWord.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
  });

  async function createPost(overrides = {}) {
    const data = {
      title: 'Test Post Title',
      content: 'This is a test post with enough content to pass validation checks.',
      category: 'recovery',
      ...overrides,
    };

    const res = await app.httpRequest()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(data);

    return res;
  }

  describe('POST /api/v1/posts', () => {
    it('should create a post', async () => {
      const res = await createPost();

      assert(res.status === 201);
      assert(res.body.code === 0);
      assert(res.body.data.post);
      assert(res.body.data.post.title === 'Test Post Title');
      assert(res.body.data.post.category === 'recovery');
    });

    it('should create a post with images', async () => {
      const res = await createPost({
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      });

      assert(res.status === 201);
      assert(res.body.data.post.images.length === 2);
    });

    it('should reject post without title', async () => {
      const res = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'content with enough length here' })
        .expect(422);

      assert(res.body.code === 1001);
    });

    it('should reject post without auth', async () => {
      await app.httpRequest()
        .post('/api/v1/posts')
        .send({ title: 'test', content: 'content' })
        .expect(401);
    });

    it('should reject too short content', async () => {
      const res = await createPost({ content: 'short' });
      assert(res.status === 400);
    });

    it('should block content with sensitive words', async () => {
      await app.model.SensitiveWord.create({ word: '诈骗', category: 'fraud' });

      const res = await createPost({ content: '这是一个诈骗信息请大家小心' });
      assert(res.status === 400);
      assert(res.body.message.includes('prohibited'));
    });
  });

  describe('GET /api/v1/posts', () => {
    it('should list posts', async () => {
      await createPost();
      await createPost({ title: 'Second Post', content: 'Another post with enough content to pass validation.' });

      const res = await app.httpRequest()
        .get('/api/v1/posts')
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.rows.length === 2);
      assert(res.body.data.count === 2);
    });

    it('should filter by category', async () => {
      await createPost({ category: 'recovery' });
      await createPost({ title: 'BCI Post', content: 'A post about brain-computer interfaces and more stuff.', category: 'bci' });

      const res = await app.httpRequest()
        .get('/api/v1/posts?category=bci')
        .expect(200);

      assert(res.body.data.rows.length === 1);
      assert(res.body.data.rows[0].category === 'bci');
    });

    it('should paginate', async () => {
      for (let i = 0; i < 3; i++) {
        await createPost({
          title: `Post ${i}`,
          content: `Content for post number ${i} with enough length.`,
        });
      }

      const res = await app.httpRequest()
        .get('/api/v1/posts?page=1&page_size=2')
        .expect(200);

      assert(res.body.data.rows.length === 2);
      assert(res.body.data.count === 3);
      assert(res.body.data.page === 1);
      assert(res.body.data.pageSize === 2);
    });

    it('should not list deleted posts', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await app.httpRequest()
        .get('/api/v1/posts')
        .expect(200);

      assert(res.body.data.rows.length === 0);
    });
  });

  describe('GET /api/v1/posts/:postId', () => {
    it('should show a single post with comments', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      const res = await app.httpRequest()
        .get(`/api/v1/posts/${postId}`)
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.post.title === 'Test Post Title');
      assert(Array.isArray(res.body.data.comments));
    });

    it('should return 404 for non-existent post', async () => {
      await app.httpRequest()
        .get('/api/v1/posts/99999')
        .expect(404);
    });
  });

  describe('PUT /api/v1/posts/:postId', () => {
    it('should update own post', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      const res = await app.httpRequest()
        .put(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      assert(res.body.data.post.title === 'Updated Title');
    });

    it('should reject update by non-owner', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      // Register another user
      const other = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'other', email: `other${Date.now()}@test.com`, password: 'password123' });

      await app.httpRequest()
        .put(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${other.body.data.token}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/posts/:postId', () => {
    it('should soft-delete own post', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify it's hidden from listing
      const res = await app.httpRequest()
        .get('/api/v1/posts')
        .expect(200);

      assert(res.body.data.rows.length === 0);
    });

    it('should reject delete by non-owner', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      const other = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'delother', email: `delother${Date.now()}@test.com`, password: 'password123' });

      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${other.body.data.token}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/posts/:postId/like', () => {
    it('should toggle like on a post', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      // Like
      const like1 = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(like1.body.data.liked === true);
      assert(like1.body.data.num_likes === 1);

      // Unlike
      const like2 = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(like2.body.data.liked === false);
      assert(like2.body.data.num_likes === 0);
    });
  });

  describe('POST /api/v1/posts/:postId/favorite', () => {
    it('should toggle favorite on a post', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      // Favorite
      const fav1 = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(fav1.body.data.favorited === true);

      // Unfavorite
      const fav2 = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(fav2.body.data.favorited === false);
    });
  });

  describe('POST /api/v1/posts/:postId/report', () => {
    it('should report a post', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'medical-fraud' })
        .expect(200);

      assert(res.body.code === 0);
    });

    it('should reject report without reason', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(422);
    });

    it('should reject duplicate pending report', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'harassment' })
        .expect(200);

      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'harassment' })
        .expect(409);
    });

    it('should require description when reason is other', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'other' })
        .expect(400);
    });

    it('should accept report with reason other and description', async () => {
      const created = await createPost();
      const postId = created.body.data.post.id;

      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/report`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'other', description: 'Custom reason here' })
        .expect(200);

      assert(res.body.code === 0);
    });
  });
});
