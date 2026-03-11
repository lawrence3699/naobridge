/**
 * Sensitive Word Filter — Unit Tests
 * TDD Phase: RED — these tests define the expected behavior
 */
const {
  createFilter,
  filterText,
  detectKeywords,
  maskKeywords
} = require('../../cloudfunctions/sensitive-filter/filter');

describe('createFilter', () => {
  it('should create a filter from a word list', () => {
    const filter = createFilter(['广告', '诈骗']);
    expect(filter).toBeDefined();
    expect(typeof filter).toBe('object');
  });

  it('should handle empty word list', () => {
    const filter = createFilter([]);
    expect(filter).toBeDefined();
  });

  it('should handle duplicate words', () => {
    const filter = createFilter(['广告', '广告', '诈骗']);
    expect(filter).toBeDefined();
  });
});

describe('detectKeywords', () => {
  let filter;

  beforeEach(() => {
    filter = createFilter([
      '虚假疗法',
      '包治百病',
      '神药',
      '广告推销',
      '歧视'
    ]);
  });

  it('should detect a single keyword in text', () => {
    const result = detectKeywords(filter, '这个神药真的有效吗');
    expect(result).toEqual(['神药']);
  });

  it('should detect multiple keywords in text', () => {
    const result = detectKeywords(filter, '这个神药包治百病');
    expect(result).toContain('神药');
    expect(result).toContain('包治百病');
    expect(result).toHaveLength(2);
  });

  it('should return empty array for clean text', () => {
    const result = detectKeywords(filter, '今天康复训练进展不错');
    expect(result).toEqual([]);
  });

  it('should handle empty text', () => {
    const result = detectKeywords(filter, '');
    expect(result).toEqual([]);
  });

  it('should detect keywords at start of text', () => {
    const result = detectKeywords(filter, '神药在这里');
    expect(result).toEqual(['神药']);
  });

  it('should detect keywords at end of text', () => {
    const result = detectKeywords(filter, '不要相信神药');
    expect(result).toEqual(['神药']);
  });

  it('should detect overlapping keywords', () => {
    const f = createFilter(['AB', 'BC']);
    const result = detectKeywords(f, 'ABC');
    // Should detect at least the first match
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should be case-insensitive for ASCII characters', () => {
    const f = createFilter(['spam', 'SCAM']);
    const result = detectKeywords(f, 'This is SPAM and a scam');
    expect(result).toContain('spam');
    expect(result).toContain('SCAM');
  });
});

describe('maskKeywords', () => {
  let filter;

  beforeEach(() => {
    filter = createFilter(['神药', '包治百病', '诈骗']);
  });

  it('should replace keyword with asterisks of same length', () => {
    const result = maskKeywords(filter, '这个神药有效吗');
    expect(result).toBe('这个**有效吗');
  });

  it('should mask multiple keywords', () => {
    const result = maskKeywords(filter, '神药包治百病');
    expect(result).toBe('******');
  });

  it('should return original text if no keywords found', () => {
    const result = maskKeywords(filter, '今天天气不错');
    expect(result).toBe('今天天气不错');
  });

  it('should handle empty text', () => {
    const result = maskKeywords(filter, '');
    expect(result).toBe('');
  });

  it('should mask with correct number of asterisks', () => {
    const result = maskKeywords(filter, '这是诈骗');
    expect(result).toBe('这是**');
  });
});

describe('filterText', () => {
  let filter;

  beforeEach(() => {
    filter = createFilter(['神药', '包治百病', '诈骗', '歧视']);
  });

  it('should return safe:true for clean text', () => {
    const result = filterText(filter, '今天康复训练做得很好，加油！');
    expect(result).toEqual({
      safe: true,
      keywords: [],
      filtered: '今天康复训练做得很好，加油！'
    });
  });

  it('should return safe:false with keywords for blocked text', () => {
    const result = filterText(filter, '这个神药包治百病');
    expect(result.safe).toBe(false);
    expect(result.keywords).toContain('神药');
    expect(result.keywords).toContain('包治百病');
    expect(result.filtered).toBe('这个******');
  });

  it('should handle text with only keywords', () => {
    const result = filterText(filter, '诈骗');
    expect(result.safe).toBe(false);
    expect(result.keywords).toEqual(['诈骗']);
    expect(result.filtered).toBe('**');
  });

  it('should handle whitespace-only text', () => {
    const result = filterText(filter, '   ');
    expect(result.safe).toBe(true);
    expect(result.keywords).toEqual([]);
  });

  it('should handle text with mixed safe and unsafe content', () => {
    const result = filterText(filter, '康复很顺利，不要相信神药，坚持科学训练');
    expect(result.safe).toBe(false);
    expect(result.keywords).toEqual(['神药']);
    expect(result.filtered).toBe('康复很顺利，不要相信**，坚持科学训练');
  });
});
