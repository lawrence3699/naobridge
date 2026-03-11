const { postApi } = require('../../utils/api');
const { formatTimeAgo } = require('../../utils/time');

const CATEGORIES = [
  { value: '', label: '全部', emoji: '📋' },
  { value: 'recovery', label: '康复日记', emoji: '💬' },
  { value: 'bci', label: '脑机接口', emoji: '🔬' },
  { value: 'emotional', label: '情感互助', emoji: '❤️' },
  { value: 'knowledge', label: '知识科普', emoji: '📚' },
  { value: 'qa', label: '求助问答', emoji: '❓' },
  { value: 'free', label: '自由话题', emoji: '🗣️' }
];

const CATEGORY_LABELS = {
  recovery: '康复日记',
  bci: '脑机接口',
  emotional: '情感互助',
  knowledge: '知识科普',
  qa: '求助问答',
  free: '自由话题'
};

const PAGE_SIZE = 20;

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '',
    posts: [],
    loading: false,
    hasMore: true,
    page: 1
  },

  onLoad() {
    this.loadPosts(true);
  },

  onShow() {
    // Refresh if returning from create-post
    if (this._needRefresh) {
      this.loadPosts(true);
      this._needRefresh = false;
    }
  },

  onPullDownRefresh() {
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadPosts(reset) {
    if (this.data.loading) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    const result = await postApi.getList(
      this.data.activeCategory || undefined,
      page,
      PAGE_SIZE
    );

    if (result.code === 0) {
      const newPosts = result.data.posts.map(post => ({
        ...post,
        contentPreview: post.content.slice(0, 100),
        categoryLabel: CATEGORY_LABELS[post.category] || '',
        timeAgo: formatTimeAgo(post.createdAt)
      }));

      const allPosts = reset ? newPosts : [...this.data.posts, ...newPosts];
      const hasMore = allPosts.length < result.data.pagination.total;

      this.setData({
        posts: allPosts,
        page: page + 1,
        hasMore,
        loading: false
      });
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: result.message || '加载失败', icon: 'none' });
    }
  },

  onSwitchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category });
    this.loadPosts(true);
  },

  onOpenPost(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${postId}` });
  },

  onCreatePost() {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }
    this._needRefresh = true;
    wx.navigateTo({ url: '/pages/create-post/create-post' });
  },

  onLoadMore() {
    if (this.data.hasMore) {
      this.loadPosts(false);
    }
  }
});
