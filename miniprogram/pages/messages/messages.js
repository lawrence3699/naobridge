const { notificationApi } = require('../../utils/api');
const { formatTimeAgo } = require('../../utils/time');

const TYPE_LABELS = {
  comment: '评论',
  reply: '回复',
  system: '系统',
  'report-result': '举报结果',
};

Page({
  data: {
    messages: [],
    loading: true,
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    this.loadMessages();
  },

  async loadMessages() {
    this.setData({ loading: true });

    const result = await notificationApi.getList();

    if (result.code === 0) {
      const messages = (result.data.rows || []).map(n => ({
        ...n,
        typeLabel: TYPE_LABELS[n.type] || '通知',
        timeAgo: formatTimeAgo(n.createdAt),
      }));
      this.setData({ messages, loading: false });
    } else {
      this.setData({ messages: [], loading: false });
    }
  },

  async onOpenMessage(e) {
    const { id, related, type } = e.currentTarget.dataset;

    // Mark as read
    await notificationApi.markRead(id);

    // Navigate based on type
    if (type === 'comment' || type === 'reply') {
      wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${related}` });
    }

    // Refresh
    this.loadMessages();
  },
});
