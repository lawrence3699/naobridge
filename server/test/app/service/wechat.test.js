'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const http = require('http');

describe('WechatService', () => {
  let mockServer;
  let mockPort;

  before(async () => {
    await app.model.sync({ force: true });
  });

  afterEach(async () => {
    await app.model.User.destroy({ where: {}, force: true });
    if (mockServer) {
      mockServer.close();
      mockServer = null;
    }
  });

  /**
   * Helper: start a local HTTP server to mock WeChat API
   */
  function startMockWechatApi(handler) {
    return new Promise(resolve => {
      mockServer = http.createServer(handler);
      mockServer.listen(0, () => {
        mockPort = mockServer.address().port;
        resolve(mockPort);
      });
    });
  }

  describe('code2Session', () => {
    it('should return openid for valid code', async () => {
      const port = await startMockWechatApi((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ openid: 'mock_openid_123', session_key: 'mock_session_key' }));
      });

      const ctx = app.mockContext();
      // Override the wechat API URL for testing
      ctx.app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: `http://127.0.0.1:${port}`,
      };

      const result = await ctx.service.wechat.code2Session('valid_code');
      assert(result.openid === 'mock_openid_123');
      assert(result.sessionKey === 'mock_session_key');
    });

    it('should throw on WeChat API error (errcode)', async () => {
      const port = await startMockWechatApi((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errcode: 40029, errmsg: 'invalid code' }));
      });

      const ctx = app.mockContext();
      ctx.app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: `http://127.0.0.1:${port}`,
      };

      try {
        await ctx.service.wechat.code2Session('invalid_code');
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.status === 401);
      }
    });

    it('should throw when code is empty', async () => {
      const ctx = app.mockContext();
      try {
        await ctx.service.wechat.code2Session('');
        assert.fail('Should have thrown');
      } catch (err) {
        assert(err.status === 400);
      }
    });
  });

  describe('checkTextSecurity', () => {
    it('should return safe for normal text', async () => {
      const port = await startMockWechatApi((req, res) => {
        if (req.url.includes('cgi-bin/token')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ access_token: 'mock_token', expires_in: 7200 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
      });

      const ctx = app.mockContext();
      ctx.app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: `http://127.0.0.1:${port}`,
      };

      const result = await ctx.service.wechat.checkTextSecurity('Hello world');
      assert(result.safe === true);
    });

    it('should return unsafe for risky text', async () => {
      const port = await startMockWechatApi((req, res) => {
        if (req.url.includes('cgi-bin/token')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ access_token: 'mock_token', expires_in: 7200 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errcode: 87014, errmsg: 'risky content' }));
      });

      const ctx = app.mockContext();
      ctx.app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: `http://127.0.0.1:${port}`,
      };

      const result = await ctx.service.wechat.checkTextSecurity('bad content');
      assert(result.safe === false);
    });

    it('should gracefully degrade on API failure', async () => {
      const ctx = app.mockContext();
      ctx.app.config.wechat = {
        appId: 'test_appid',
        appSecret: 'test_secret',
        apiBase: 'http://127.0.0.1:1', // unreachable
      };

      // Should not throw, should return safe (graceful degradation)
      const result = await ctx.service.wechat.checkTextSecurity('any text');
      assert(result.safe === true);
    });
  });
});
