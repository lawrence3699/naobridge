/**
 * Content Security — server-side checks via Egg.js backend
 *
 * Text security is handled automatically by the server during post/comment creation.
 * These frontend utilities provide pre-submission checks for better UX.
 */

/**
 * Check text content via server-side security check
 * Note: The server also runs this check during creation, so this is optional UX improvement
 * @param {string} text - text to check
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function checkTextSecurity(text) {
  if (!text || !text.trim()) {
    return { safe: true, message: '' };
  }

  // Server handles content security during post/comment creation.
  // Frontend can skip pre-check — the server will reject unsafe content.
  return { safe: true, message: '' };
}

/**
 * Check image content via WeChat Cloud storage + server check
 * @param {string} filePath - temporary file path from wx.chooseImage
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function checkImageSecurity(filePath) {
  if (!filePath) {
    return { safe: false, message: '图片路径无效' };
  }

  // Image security check will be done server-side during upload
  // For now, allow all images and let the server handle rejection
  return { safe: true, message: '' };
}

/**
 * Validate content before submission
 * @param {string} text - text content
 * @param {string} scene - 'post' | 'comment' | 'nickname'
 * @returns {Promise<{ safe: boolean, message: string }>}
 */
async function validateContent(text, scene) {
  return checkTextSecurity(text);
}

module.exports = {
  checkTextSecurity,
  checkImageSecurity,
  validateContent,
};
