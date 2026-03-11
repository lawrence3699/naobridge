Page({
  data: {
    showAgreeButton: false
  },

  onLoad(options) {
    // Show agree button only during registration flow
    if (options.fromRegister === 'true') {
      this.setData({ showAgreeButton: true });
    }
  },

  onAgree() {
    // Navigate back to profile setup with agreement confirmed
    const pages = getCurrentPages();
    if (pages.length >= 2) {
      const prevPage = pages[pages.length - 2];
      if (prevPage.onRulesAgreed) {
        prevPage.onRulesAgreed();
      }
    }
    wx.navigateBack();
  }
});
