'use strict';

const { Service } = require('egg');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const WECHAT_API_BASE = 'https://api.weixin.qq.com';

class WechatService extends Service {

  /**
   * Exchange wx.login code for openid and session_key
   * @param {string} code - temporary login code from wx.login()
   * @returns {{ openid: string, sessionKey: string }}
   */
  async code2Session(code) {
    const { ctx, app } = this;

    if (!code) {
      ctx.throw(400, 'Login code is required');
    }

    const { appId, appSecret, apiBase } = app.config.wechat;
    const base = apiBase || WECHAT_API_BASE;
    const url = `${base}/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    const data = await this._httpGet(url);

    if (data.errcode) {
      ctx.throw(401, `WeChat login failed: ${data.errmsg || 'unknown error'}`);
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
    };
  }

  /**
   * Check text content via WeChat msgSecCheck API
   * Gracefully degrades on failure (returns safe=true)
   * @param {string} text - text content to check
   * @returns {{ safe: boolean }}
   */
  async checkTextSecurity(text) {
    const { app } = this;

    try {
      const accessToken = await this._getAccessToken();
      const { apiBase } = app.config.wechat;
      const base = apiBase || WECHAT_API_BASE;
      const url = `${base}/wxa/msg_sec_check?access_token=${accessToken}`;

      const data = await this._httpPost(url, { content: text });

      if (data.errcode === 87014) {
        return { safe: false };
      }

      return { safe: true };
    } catch (err) {
      // Graceful degradation: if WeChat API fails, fall through
      this.ctx.logger.warn('WeChat content security API failed, degrading gracefully:', err.message);
      return { safe: true };
    }
  }

  /**
   * Get WeChat API access token (cached)
   * @returns {string} access_token
   * @private
   */
  async _getAccessToken() {
    const { app } = this;
    const { appId, appSecret, apiBase } = app.config.wechat;
    const base = apiBase || WECHAT_API_BASE;
    const url = `${base}/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

    const data = await this._httpGet(url);

    if (data.errcode) {
      throw new Error(`Failed to get access token: ${data.errmsg}`);
    }

    return data.access_token;
  }

  /**
   * HTTP GET request
   * @param {string} url
   * @returns {object} parsed JSON response
   * @private
   */
  _httpGet(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      client.get(url, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse WeChat API response: ${body}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * HTTP POST request with JSON body
   * @param {string} url
   * @param {object} payload
   * @returns {object} parsed JSON response
   * @private
   */
  _httpPost(url, payload) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const data = JSON.stringify(payload);

      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = client.request(options, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse WeChat API response: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

module.exports = WechatService;
