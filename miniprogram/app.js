const { userApi, getToken } = require('./utils/api');

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true,
    });

    // Auto-login: check if user has a valid token
    const token = getToken();
    if (token) {
      userApi.getProfile().then(res => {
        if (res.code === 0) {
          this.globalData.userInfo = res.data;
          this.globalData.isLoggedIn = true;
        }
      });
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    cloudEnv: 'prod-4gp6g6tae6a348de',
  },
});
