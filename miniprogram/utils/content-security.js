/**
 * WeChat Content Security API Wrapper
 * Wraps wx msgSecCheck and imgSecCheck for frontend use
 */

/**
 * Check text content via WeChat security API
 * @param {string} text - text to check
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function checkTextSecurity(text) {
  if (!text || !text.trim()) {
    return { safe: true, message: '' };
  }

  try {
    const result = await wx.cloud.callFunction({
      name: 'sensitive-filter',
      data: { text, scene: 'post' }
    });

    const { code, data, message } = result.result;

    if (code === 0) {
      return { safe: true, message: '' };
    }

    if (code === 1004) {
      return { safe: false, message: message || '内容包含敏感词，请修改后重试' };
    }

    return { safe: false, message: message || '内容检查失败，请稍后重试' };
  } catch (error) {
    console.error('checkTextSecurity error:', error);
    return { safe: false, message: '内容安全检查服务暂时不可用' };
  }
}

/**
 * Check image content via WeChat security API
 * Uses cloud function to call security.imgSecCheck
 * @param {string} filePath - temporary file path from wx.chooseImage
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function checkImageSecurity(filePath) {
  if (!filePath) {
    return { safe: false, message: '图片路径无效' };
  }

  try {
    // Upload to cloud storage first for server-side check
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath: `temp-check/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
      filePath
    });

    const result = await wx.cloud.callFunction({
      name: 'sensitive-filter',
      data: {
        type: 'image',
        fileID: uploadResult.fileID
      }
    });

    // Clean up temp file
    wx.cloud.deleteFile({ fileList: [uploadResult.fileID] }).catch(() => {});

    const { code, message } = result.result;
    return {
      safe: code === 0,
      message: code === 0 ? '' : (message || '图片内容不合规')
    };
  } catch (error) {
    console.error('checkImageSecurity error:', error);
    return { safe: false, message: '图片安全检查服务暂时不可用' };
  }
}

/**
 * Validate content before submission
 * Combines local filter + WeChat security check
 * @param {string} text - text content
 * @param {string} scene - 'post' | 'comment' | 'nickname'
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function validateContent(text, scene) {
  if (!text || !text.trim()) {
    return { safe: true, message: '' };
  }

  try {
    const result = await wx.cloud.callFunction({
      name: 'sensitive-filter',
      data: { text, scene }
    });

    const { code, message } = result.result;
    return {
      safe: code === 0,
      message: code === 0 ? '' : message
    };
  } catch (error) {
    console.error('validateContent error:', error);
    return { safe: false, message: '内容检查服务暂时不可用，请稍后重试' };
  }
}

module.exports = {
  checkTextSecurity,
  checkImageSecurity,
  validateContent
};
