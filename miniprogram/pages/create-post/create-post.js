const { postApi } = require('../../utils/api');

const CATEGORIES = [
  { value: 'recovery', label: '康复日记' },
  { value: 'bci', label: '脑机接口讨论' },
  { value: 'knowledge', label: '知识科普' },
  { value: 'qa', label: '求助问答' },
  { value: 'free', label: '自由话题' },
];

Page({
  data: {
    title: '',
    content: '',
    selectedCategory: '',
    images: [],
    categories: CATEGORIES,
    canSubmit: false,
    submitting: false,
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
    this.updateCanSubmit();
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.updateCanSubmit();
  },

  onSelectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.category });
    this.updateCanSubmit();
  },

  updateCanSubmit() {
    const { title, content, selectedCategory } = this.data;
    this.setData({
      canSubmit: title.trim().length > 0 && content.trim().length >= 10 && selectedCategory,
    });
  },

  onChooseImage() {
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) return;

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ images: [...this.data.images, ...newPaths] });
      },
    });
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  async onSubmit() {
    const { title, content, selectedCategory, images, submitting } = this.data;

    if (submitting) return;

    if (!title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }

    if (content.trim().length < 10) {
      wx.showToast({ title: '正文内容不能少于10个字', icon: 'none' });
      return;
    }

    if (!selectedCategory) {
      wx.showToast({ title: '请选择分类标签', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    // Upload images to cloud storage if any
    let cloudImages = [];
    if (images.length > 0) {
      try {
        cloudImages = await this.uploadImages(images);
      } catch (err) {
        this.setData({ submitting: false });
        wx.showToast({ title: '图片上传失败，请重试', icon: 'none' });
        return;
      }
    }

    const result = await postApi.create(
      title.trim(),
      content,
      selectedCategory,
      cloudImages
    );

    this.setData({ submitting: false });

    if (result.code === 0) {
      wx.showToast({ title: '发布成功！', icon: 'none', duration: 1500 });
      setTimeout(() => wx.navigateBack(), 1500);
    } else {
      wx.showToast({ title: result.message || '发布失败', icon: 'none' });
    }
  },

  async uploadImages(imagePaths) {
    const uploadTasks = imagePaths.map((filePath, index) => {
      const ext = filePath.split('.').pop() || 'jpg';
      const cloudPath = `posts/${Date.now()}-${index}.${ext}`;
      return wx.cloud.uploadFile({ cloudPath, filePath });
    });

    const results = await Promise.all(uploadTasks);
    return results.map(r => r.fileID);
  },
});
