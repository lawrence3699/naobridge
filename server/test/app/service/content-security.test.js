'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const http = require('http');

describe('Content Security Integration', () => {
  let token;
  let userId;
  let mockServer;

  before(async () => {
    await app.model.sync({ force: true });
  });

  beforeEach(async () => {
    const reg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'secuser', email: `sec${Date.now()}@test.com`, password: 'password123' });
    token = reg.body.data.token;
    userId = reg.body.data.user.id;
  });

  afterEach(async () => {
    await app.model.PostComment.destroy({ where: {}, force: true });
    await app.model.PostImage.destroy({ where: {}, force: true });
    await app.model.Post.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.SensitiveWord.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
    if (mockServer) {
      mockServer.close();
      mockServer = null;
    }
  });

  function setupWechatMock(options = {}) {
    const { rejectText = false } = options;
    return new Promise(resolve => {
      mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.url.includes('cgi-bin/token')) {
          res.end(JSON.stringify({ access_token: 'mock_token', expires_in: 7200 }));
        } else if (req.url.includes('msg_sec_check')) {
          if (rejectText) {
            res.end(JSON.stringify({ errcode: 87014, errmsg: 'risky content' }));
          } else {
            res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
          }
        } else {
          res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
        }
      });
      mockServer.listen(0, () => {
        const port = mockServer.address().port;
        app.config.wechat = {
          appId: 'test_appid',
          appSecret: 'test_secret',
          apiBase: `http://127.0.0.1:${port}`,
        };
        resolve(port);
      });
    });
  }

  describe('Post creation with WeChat content security', () => {
    it('should allow post when WeChat API says safe', async () => {
      await setupWechatMock({ rejectText: false });

      const res = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Safe Post',
          content: 'This is perfectly safe content for testing purposes.',
          category: 'recovery',
        })
        .expect(201);

      assert(res.body.code === 0);
      assert(res.body.data.post.title === 'Safe Post');
    });

    it('should reject post when WeChat API says unsafe', async () => {
      await setupWechatMock({ rejectText: true });

      const res = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Bad Post',
          content: 'This content will be rejected by WeChat security check.',
          category: 'recovery',
        })
        .expect(400);

      assert(res.body.message.includes('security'));
    });

    it('should gracefully degrade when WeChat API is unreachable', async () => {
      // Point to unreachable address
      app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: 'http://127.0.0.1:1',
      };

      // Should still create post (falls back to local filter only)
      const res = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Degraded Post',
          content: 'This should pass with graceful degradation on security API failure.',
          category: 'recovery',
        })
        .expect(201);

      assert(res.body.code === 0);
    });
  });

  describe('Comment creation with WeChat content security', () => {
    let postId;

    beforeEach(async () => {
      // Ensure wechat mock is not blocking
      app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: 'http://127.0.0.1:1', // unreachable = graceful degrade
      };

      const postRes = await app.httpRequest()
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Comment Test Post',
          content: 'A post to add comments to for testing purposes.',
          category: 'recovery',
        });
      postId = postRes.body.data.post.id;
    });

    it('should allow comment when WeChat API says safe', async () => {
      await setupWechatMock({ rejectText: false });

      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'A safe and helpful comment.' })
        .expect(201);

      assert(res.body.code === 0);
    });

    it('should reject comment when WeChat API says unsafe', async () => {
      await setupWechatMock({ rejectText: true });

      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'This comment is unsafe.' })
        .expect(400);

      assert(res.body.message.includes('security'));
    });
  });
});
