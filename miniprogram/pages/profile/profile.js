const { userApi, contentApi } = require('../../utils/api');

const ROLE_OPTIONS = [
  { value: 'patient', label: '患者本人', emoji: '💪' },
  { value: 'family', label: '家属', emoji: '🤝' },
  { value: 'supporter', label: '关注者', emoji: '❤️' }
];

const ROLE_LABELS = {
  patient: '患者本人',
  family: '家属',
  supporter: '关注者'
};

Page({
  data: {
    loading: true,
    isNewUser: true,
    userInfo: null,
    roleLabel: '',

    // Registration form
    nickName: '',
    selectedRole: '',
    agreedToRules: false,
    canSubmit: false,
    roleOptions: ROLE_OPTIONS
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    if (!this.data.isNewUser) {
      this.loadProfile();
    }
  },

  async checkLoginStatus() {
    this.setData({ loading: true });

    const result = await userApi.login();

    if (result.code === 0) {
      if (result.data.isNewUser) {
        this.setData({ isNewUser: true, loading: false });
      } else {
        this.setData({
          isNewUser: false,
          userInfo: result.data.user,
          roleLabel: ROLE_LABELS[result.data.user.role] || '',
          loading: false
        });
        getApp().globalData.userInfo = result.data.user;
        getApp().globalData.isLoggedIn = true;
      }
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: result.message || '登录失败', icon: 'none' });
    }
  },

  async loadProfile() {
    const result = await userApi.getProfile();
    if (result.code === 0) {
      this.setData({
        userInfo: result.data,
        roleLabel: ROLE_LABELS[result.data.role] || ''
      });
      getApp().globalData.userInfo = result.data;
    }
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
    this.updateCanSubmit();
  },

  onSelectRole(e) {
    this.setData({ selectedRole: e.currentTarget.dataset.role });
    this.updateCanSubmit();
  },

  onGoToRules() {
    wx.navigateTo({
      url: '/pages/community-rules/community-rules?fromRegister=true'
    });
  },

  // Called by community-rules page when user agrees
  onRulesAgreed() {
    this.setData({ agreedToRules: true });
    this.updateCanSubmit();
  },

  updateCanSubmit() {
    const { nickName, selectedRole, agreedToRules } = this.data;
    this.setData({
      canSubmit: nickName.trim().length > 0 && selectedRole && agreedToRules
    });
  },

  async onSubmitRegister() {
    const { nickName, selectedRole } = this.data;

    if (!nickName.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    // Check nickname through sensitive filter
    const checkResult = await contentApi.checkText(nickName.trim(), 'nickname');
    if (checkResult.code === 1004) {
      wx.showToast({ title: '昵称包含敏感词，请修改', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const result = await userApi.register(nickName.trim(), selectedRole, '');

    if (result.code === 0) {
      this.setData({
        isNewUser: false,
        userInfo: result.data.user,
        roleLabel: ROLE_LABELS[selectedRole] || '',
        loading: false
      });
      getApp().globalData.userInfo = result.data.user;
      getApp().globalData.isLoggedIn = true;

      wx.showToast({ title: '注册成功，欢迎加入脑桥！', icon: 'none', duration: 2000 });
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: result.message || '注册失败', icon: 'none' });
    }
  },

  onEditProfile() {
    // TODO: Phase 2 — edit profile page
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onGoToRulesView() {
    wx.navigateTo({ url: '/pages/community-rules/community-rules' });
  },

  onGoToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
