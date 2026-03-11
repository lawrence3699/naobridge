/**
 * Sensitive Filter Cloud Function
 * Entry point for WeChat Cloud Function
 */
const { createFilter, filterText } = require('./filter');

const VALID_SCENES = ['post', 'comment', 'nickname'];

/**
 * Core handler — testable without cloud environment
 * @param {{ text: string, scene: string }} params
 * @param {string[]} words - sensitive word list
 * @returns {Promise<{ code: number, data: object|null, message: string }>}
 */
async function handleFilter(params, words) {
  const { text, scene } = params || {};

  // Input validation
  if (!text) {
    return {
      code: 1001,
      data: null,
      message: '缺少必要参数：text'
    };
  }

  if (!scene) {
    return {
      code: 1001,
      data: null,
      message: '缺少必要参数：scene'
    };
  }

  if (!VALID_SCENES.includes(scene)) {
    return {
      code: 1001,
      data: null,
      message: '无效的场景参数，允许值：post, comment, nickname'
    };
  }

  // Build filter and check text
  const filter = createFilter(words);
  const result = filterText(filter, text);

  if (!result.safe) {
    return {
      code: 1004,
      data: {
        safe: false,
        keywords: result.keywords,
        filtered: result.filtered
      },
      message: '内容包含敏感词，请修改后重试'
    };
  }

  return {
    code: 0,
    data: {
      safe: true,
      keywords: [],
      filtered: result.filtered
    },
    message: ''
  };
}

/**
 * WeChat Cloud Function entry point
 * In production, loads words from cloud database
 */
exports.main = async (event, context) => {
  try {
    const cloud = require('wx-server-sdk');
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = cloud.database();

    // Load sensitive words from database
    const { data: wordRecords } = await db
      .collection('sensitive_words')
      .limit(1000)
      .get();

    const words = wordRecords.map(record => record.word);

    return await handleFilter(event, words);
  } catch (error) {
    console.error('sensitive-filter error:', error);
    return {
      code: 2001,
      data: null,
      message: '服务器内部错误，请稍后重试'
    };
  }
};

// Export for testing
exports.handleFilter = handleFilter;
