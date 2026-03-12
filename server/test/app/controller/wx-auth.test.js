'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const http = require('http');

describe('WeChat Auth Controller', () => {
  let mockServer;
  let mockPort;

  before(async () => {
    await app.model.sync({ force: true });
  });

  afterEach(async () => {
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
    if (mockServer) {
      mockServer.close();
      mockServer = null;
    }
  });

  function startMockWechatApi(openid = 'test_openid_001') {
    return new Promise(resolve => {
      mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.url.includes('jscode2session')) {
          res.end(JSON.stringify({ openid, session_key: 'mock_sk' }));
        } else if (req.url.includes('token')) {
          res.end(JSON.stringify({ access_token: 'mock_token', expires_in: 7200 }));
        } else {
          res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
        }
      });
      mockServer.listen(0, () => {
        mockPort = mockServer.address().port;
        app.config.wechat = {
          appId: 'test_appid',
          appSecret: 'test_secret',
          apiBase: `http://127.0.0.1:${mockPort}`,
        };
        resolve(mockPort);
      });
    });
  }

  describe('POST /api/v1/wx-login', () => {
    it('should return isNewUser=true for unknown openid', async () => {
      await startMockWechatApi('new_user_openid');

      const res = await app.httpRequest()
        .post('/api/v1/wx-login')
        .send({ code: 'valid_code' })
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.isNewUser === true);
      assert(!res.body.data.token);
    });

    it('should return token for existing user', async () => {
      await startMockWechatApi('existing_openid');

      // Create a user with this openid
      await app.model.User.create({
        name: 'wxuser',
        email: 'wx_existing_openid@wechat.local',
        password: 'placeholder',
        openid: 'existing_openid',
      });

      const res = await app.httpRequest()
        .post('/api/v1/wx-login')
        .send({ code: 'valid_code' })
        .expect(200);

      assert(res.body.code === 0);
      assert(res.body.data.isNewUser === false);
      assert(res.body.data.token);
      assert(res.body.data.user.name === 'wxuser');
      assert(!res.body.data.user.password);
    });

    it('should reject banned user', async () => {
      await startMockWechatApi('banned_openid');

      await app.model.User.create({
        name: 'banned',
        email: 'wx_banned_openid@wechat.local',
        password: 'placeholder',
        openid: 'banned_openid',
        status: 'banned',
      });

      const res = await app.httpRequest()
        .post('/api/v1/wx-login')
        .send({ code: 'valid_code' })
        .expect(403);

      assert(res.body.code === 1002);
    });

    it('should reject without code', async () => {
      await app.httpRequest()
        .post('/api/v1/wx-login')
        .send({})
        .expect(422);
    });
  });

  describe('POST /api/v1/wx-register', () => {
    it('should register new user with openid', async () => {
      await startMockWechatApi('register_openid');

      const res = await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ code: 'valid_code', name: 'NewUser', role: 'patient' })
        .expect(201);

      assert(res.body.code === 0);
      assert(res.body.data.token);
      assert(res.body.data.user.name === 'NewUser');
      assert(res.body.data.user.role === 'patient');
      assert(res.body.data.user.openid === 'register_openid');
      assert(!res.body.data.user.password);
    });

    it('should default role to supporter', async () => {
      await startMockWechatApi('role_default_openid');

      const res = await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ code: 'valid_code', name: 'DefaultRole' })
        .expect(201);

      assert(res.body.data.user.role === 'supporter');
    });

    it('should reject duplicate openid', async () => {
      await startMockWechatApi('dup_openid');

      await app.model.User.create({
        name: 'existing',
        email: 'wx_dup_openid@wechat.local',
        password: 'placeholder',
        openid: 'dup_openid',
      });

      const res = await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ code: 'valid_code', name: 'Duplicate' })
        .expect(409);

      assert(res.body.code === 1001);
    });

    it('should reject without name', async () => {
      await startMockWechatApi();

      await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ code: 'valid_code' })
        .expect(422);
    });

    it('should reject without code', async () => {
      await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ name: 'NoCode' })
        .expect(422);
    });

    it('should block sensitive nickname', async () => {
      await startMockWechatApi('sensitive_openid');

      await app.model.SensitiveWord.create({ word: '诈骗犯', category: 'fraud' });

      const res = await app.httpRequest()
        .post('/api/v1/wx-register')
        .send({ code: 'valid_code', name: '诈骗犯小王' })
        .expect(400);

      assert(res.body.message.includes('prohibited'));

      await app.model.SensitiveWord.destroy({ where: {}, force: true });
    });
  });
});
