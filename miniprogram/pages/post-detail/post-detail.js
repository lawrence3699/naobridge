const { postApi, callFunction } = require('../../utils/api');
const { formatTimeAgo, formatDate } = require('../../utils/time');

const CATEGORY_LABELS = {
  recovery: '康复日记',
  bci: '脑机接口',
  emotional: '情感互助',
  knowledge: '知识科普',
  qa: '求助问答',
  free: '自由话题'
};

Page({
  data: {
    post: null,
    postDate: '',
    categoryLabel: '',
    isAuthor: false,
    comments: [],
    commentText: '',
    replyTo: '',
    replyToId: '',
    loading: true
  },

  onLoad(options) {
    this.postId = options.id;
    if (this.postId) {
      this.loadPostDetail();
      this.loadComments();
    }
  },

  async loadPostDetail() {
    this.setData({ loading: true });

    const result = await postApi.getDetail(this.postId);

    if (result.code === 0) {
      const app = getApp();
      const currentUser = app.globalData.userInfo;
      const isAuthor = currentUser && result.data.authorId === currentUser._openid;

      this.setData({
        post: result.data,
        postDate: formatDate(result.data.createdAt),
        categoryLabel: CATEGORY_LABELS[result.data.category] || '',
        isAuthor,
        loading: false
      });
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: result.message || '加载失败', icon: 'none' });
    }
  },

  async loadComments() {
    const result = await callFunction('comment', {
      action: 'list',
      postId: this.postId
    });

    if (result.code === 0) {
      const comments = result.data.comments.map(c => ({
        ...c,
        timeAgo: formatTimeAgo(c.createdAt)
      }));
      this.setData({ comments });
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  async onSendComment() {
    const { commentText, replyToId } = this.data;

    if (!commentText.trim()) return;

    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const result = await callFunction('comment', {
      action: 'create',
      postId: this.postId,
      content: commentText.trim(),
      parentId: replyToId || undefined
    });

    if (result.code === 0) {
      this.setData({ commentText: '', replyTo: '', replyToId: '' });
      wx.showToast({ title: '评论成功', icon: 'none' });
      this.loadComments();
    } else {
      wx.showToast({ title: result.message || '评论失败', icon: 'none' });
    }
  },

  onReply(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({ replyTo: name, replyToId: id });
  },

  onReport(e) {
    const { type, id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/report/report?type=${type}&id=${id}` });
  },

  async onDeletePost() {
    const { confirm } = await wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这篇帖子吗？',
      confirmText: '删除',
      confirmColor: '#FF4444'
    });

    if (!confirm) return;

    const result = await postApi.delete(this.postId);

    if (result.code === 0) {
      wx.showToast({ title: '已删除', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
    } else {
      wx.showToast({ title: result.message || '删除失败', icon: 'none' });
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.post.images
    });
  }
});
