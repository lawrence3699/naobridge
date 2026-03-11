const { reportApi } = require('../../utils/api');

const REASONS = [
  { value: 'medical-fraud', label: '虚假医疗信息' },
  { value: 'ad-spam', label: '广告 / 诈骗' },
  { value: 'harassment', label: '人身攻击 / 歧视' },
  { value: 'violence', label: '色情 / 暴力' },
  { value: 'other', label: '其他（需填写说明）' }
];

Page({
  data: {
    targetType: '',
    targetId: '',
    reasons: REASONS,
    selectedReason: '',
    description: '',
    canSubmit: false,
    submitting: false
  },

  onLoad(options) {
    this.setData({
      targetType: options.type || '',
      targetId: options.id || ''
    });
  },

  onSelectReason(e) {
    this.setData({ selectedReason: e.currentTarget.dataset.reason });
    this.updateCanSubmit();
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
    this.updateCanSubmit();
  },

  updateCanSubmit() {
    const { selectedReason, description } = this.data;
    const needsDescription = selectedReason === 'other';
    this.setData({
      canSubmit: selectedReason && (!needsDescription || description.trim().length > 0)
    });
  },

  async onSubmit() {
    const { targetType, targetId, selectedReason, description, submitting } = this.data;

    if (submitting) return;

    if (!selectedReason) {
      wx.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const result = await reportApi.create(targetType, targetId, selectedReason, description);

    this.setData({ submitting: false });

    if (result.code === 0) {
      wx.showToast({ title: '举报已提交，我们会尽快处理', icon: 'none', duration: 2000 });
      setTimeout(() => wx.navigateBack(), 2000);
    } else {
      wx.showToast({ title: result.message || '提交失败', icon: 'none' });
    }
  }
});
