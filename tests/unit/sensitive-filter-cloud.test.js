/**
 * Sensitive Filter Cloud Function — Unit Tests
 * Tests the cloud function entry point with unified response format
 */
const { handleFilter } = require('../../cloudfunctions/sensitive-filter/index');

// Mock default word list
const DEFAULT_WORDS = ['神药', '包治百病', '诈骗', '虚假疗法', '歧视残疾人'];

describe('handleFilter cloud function', () => {
  describe('input validation', () => {
    it('should return error 1001 when text is missing', async () => {
      const result = await handleFilter({ scene: 'post' }, DEFAULT_WORDS);
      expect(result).toEqual({
        code: 1001,
        data: null,
        message: '缺少必要参数：text'
      });
    });

    it('should return error 1001 when text is empty string', async () => {
      const result = await handleFilter({ text: '', scene: 'post' }, DEFAULT_WORDS);
      expect(result).toEqual({
        code: 1001,
        data: null,
        message: '缺少必要参数：text'
      });
    });

    it('should return error 1001 when scene is missing', async () => {
      const result = await handleFilter({ text: '你好' }, DEFAULT_WORDS);
      expect(result).toEqual({
        code: 1001,
        data: null,
        message: '缺少必要参数：scene'
      });
    });

    it('should return error 1001 when scene is invalid', async () => {
      const result = await handleFilter(
        { text: '你好', scene: 'invalid' },
        DEFAULT_WORDS
      );
      expect(result).toEqual({
        code: 1001,
        data: null,
        message: '无效的场景参数，允许值：post, comment, nickname'
      });
    });
  });

  describe('safe content', () => {
    it('should return code 0 with safe:true for clean text', async () => {
      const result = await handleFilter(
        { text: '今天康复训练做得不错', scene: 'post' },
        DEFAULT_WORDS
      );
      expect(result).toEqual({
        code: 0,
        data: { safe: true, keywords: [], filtered: '今天康复训练做得不错' },
        message: ''
      });
    });

    it('should handle post scene', async () => {
      const result = await handleFilter(
        { text: '分享我的康复日记', scene: 'post' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(0);
      expect(result.data.safe).toBe(true);
    });

    it('should handle comment scene', async () => {
      const result = await handleFilter(
        { text: '加油！你一定可以的', scene: 'comment' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(0);
      expect(result.data.safe).toBe(true);
    });

    it('should handle nickname scene', async () => {
      const result = await handleFilter(
        { text: '康复小战士', scene: 'nickname' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(0);
      expect(result.data.safe).toBe(true);
    });
  });

  describe('blocked content', () => {
    it('should return code 1004 for text with sensitive words', async () => {
      const result = await handleFilter(
        { text: '这个神药包治百病', scene: 'post' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(1004);
      expect(result.data.safe).toBe(false);
      expect(result.data.keywords).toContain('神药');
      expect(result.data.keywords).toContain('包治百病');
      expect(result.data.filtered).toBe('这个******');
      expect(result.message).toBe('内容包含敏感词，请修改后重试');
    });

    it('should detect sensitive words in nickname', async () => {
      const result = await handleFilter(
        { text: '诈骗大师', scene: 'nickname' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(1004);
      expect(result.data.safe).toBe(false);
    });

    it('should detect sensitive words in comment', async () => {
      const result = await handleFilter(
        { text: '这是虚假疗法别信', scene: 'comment' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(1004);
      expect(result.data.keywords).toContain('虚假疗法');
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', async () => {
      const longText = '今天天气不错'.repeat(1000);
      const result = await handleFilter(
        { text: longText, scene: 'post' },
        DEFAULT_WORDS
      );
      expect(result.code).toBe(0);
      expect(result.data.safe).toBe(true);
    });

    it('should handle empty word list gracefully', async () => {
      const result = await handleFilter(
        { text: '任何文字都可以', scene: 'post' },
        []
      );
      expect(result.code).toBe(0);
      expect(result.data.safe).toBe(true);
    });
  });
});
