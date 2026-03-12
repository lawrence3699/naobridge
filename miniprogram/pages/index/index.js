const { postApi } = require('../../utils/api');
const { formatTimeAgo } = require('../../utils/time');

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'recovery', label: '康复日记' },
  { value: 'bci', label: '脑机接口' },
  { value: 'knowledge', label: '知识科普' },
  { value: 'qa', label: '求助问答' },
  { value: 'free', label: '自由话题' },
];

const CATEGORY_LABELS = {
  recovery: '康复日记',
  bci: '脑机接口',
  knowledge: '知识科普',
  qa: '求助问答',
  free: '自由话题',
};

const PAGE_SIZE = 20;

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '',
    posts: [],
    loading: false,
    hasMore: true,
    refreshing: false,
    page: 1,
  },

  onLoad() {
    this.loadPosts(true);
  },

  onShow() {
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

  onPullRefresh() {
    this.loadPosts(true).then(() => {
      this.setData({ refreshing: false });
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
      const rawPosts = result.data.rows || result.data.posts || [];
      const total = result.data.count != null
        ? result.data.count
        : (result.data.pagination ? result.data.pagination.total : 0);

      const newPosts = rawPosts.map(post => this._mapPost(post));
      const allPosts = reset ? newPosts : [...this.data.posts, ...newPosts];
      const hasMore = allPosts.length < total;

      this.setData({
        posts: allPosts,
        page: page + 1,
        hasMore,
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: result.msg || result.message || '加载失败', icon: 'none' });
    }
  },

  /**
   * Map raw API post object to view model
   */
  _mapPost(post) {
    const user = post.user || {};
    const images = post.images || [];
    const imageUrls = images.map(img => (typeof img === 'string' ? img : img.url));

    return {
      id: post.id || post._id,
      authorName: user.name || post.authorName || '匿名用户',
      avatarUrl: user.avatar || post.avatarUrl || '',
      title: post.title || '',
      contentPreview: (post.content || '').slice(0, 120),
      categoryLabel: CATEGORY_LABELS[post.category] || '',
      timeAgo: formatTimeAgo(post.createdAt),
      commentCount: post.num_comments || post.commentCount || 0,
      likeCount: post.num_likes || post.likeCount || 0,
      imageUrls,
    };
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

  onScrollToLower() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
    }
  },

  onPreviewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url],
    });
  },
});
