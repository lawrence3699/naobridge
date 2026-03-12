'use strict';

const assert = require('assert');
const { createFilter, detectKeywords, maskKeywords, filterText } = require('../../../app/extend/filter');

describe('Sensitive Word Filter', () => {

  describe('createFilter()', () => {
    it('should build a Trie from word list', () => {
      const root = createFilter(['hello', 'world']);
      assert(root.h);
      assert(root.h.e);
      assert(root.w);
      assert(root.w.o);
    });

    it('should handle empty word list', () => {
      const root = createFilter([]);
      assert.deepStrictEqual(Object.keys(root), []);
    });

    it('should skip empty strings', () => {
      const root = createFilter(['', null, undefined, 'test']);
      assert(root.t);
      assert(!root['']);
    });

    it('should normalize words to lowercase', () => {
      const root = createFilter(['Hello']);
      assert(root.h);
      assert(!root.H);
    });
  });

  describe('detectKeywords()', () => {
    it('should detect a single keyword', () => {
      const filter = createFilter(['fraud']);
      const found = detectKeywords(filter, 'this is fraud content');
      assert.deepStrictEqual(found, ['fraud']);
    });

    it('should detect multiple keywords', () => {
      const filter = createFilter(['fraud', 'scam']);
      const found = detectKeywords(filter, 'this is fraud and scam');
      assert(found.includes('fraud'));
      assert(found.includes('scam'));
      assert.strictEqual(found.length, 2);
    });

    it('should be case-insensitive', () => {
      const filter = createFilter(['fraud']);
      const found = detectKeywords(filter, 'This is FRAUD content');
      assert.deepStrictEqual(found, ['fraud']);
    });

    it('should return empty array for clean text', () => {
      const filter = createFilter(['fraud', 'scam']);
      const found = detectKeywords(filter, 'this is clean content');
      assert.deepStrictEqual(found, []);
    });

    it('should return empty array for empty text', () => {
      const filter = createFilter(['fraud']);
      const found = detectKeywords(filter, '');
      assert.deepStrictEqual(found, []);
    });

    it('should return empty array for null text', () => {
      const filter = createFilter(['fraud']);
      const found = detectKeywords(filter, null);
      assert.deepStrictEqual(found, []);
    });

    it('should detect overlapping keywords', () => {
      const filter = createFilter(['ab', 'bc']);
      const found = detectKeywords(filter, 'abc');
      assert(found.includes('ab'));
      assert(found.includes('bc'));
    });

    it('should detect keywords within words', () => {
      const filter = createFilter(['特效药']);
      const found = detectKeywords(filter, '这个特效药很好');
      assert.deepStrictEqual(found, ['特效药']);
    });

    it('should not produce duplicate entries', () => {
      const filter = createFilter(['ab']);
      const found = detectKeywords(filter, 'ab ab ab');
      assert.strictEqual(found.length, 1);
    });
  });

  describe('maskKeywords()', () => {
    it('should replace keyword characters with asterisks', () => {
      const filter = createFilter(['fraud']);
      const result = maskKeywords(filter, 'this is fraud');
      assert.strictEqual(result, 'this is *****');
    });

    it('should mask multiple keywords', () => {
      const filter = createFilter(['fraud', 'scam']);
      const result = maskKeywords(filter, 'fraud and scam');
      assert.strictEqual(result, '***** and ****');
    });

    it('should be case-insensitive but preserve original casing in non-keyword text', () => {
      const filter = createFilter(['fraud']);
      const result = maskKeywords(filter, 'This FRAUD here');
      assert.strictEqual(result, 'This ***** here');
    });

    it('should return empty string for null input', () => {
      const filter = createFilter(['fraud']);
      const result = maskKeywords(filter, null);
      assert.strictEqual(result, '');
    });

    it('should return original text when no keywords found', () => {
      const filter = createFilter(['fraud']);
      const result = maskKeywords(filter, 'clean text');
      assert.strictEqual(result, 'clean text');
    });

    it('should mask Chinese characters correctly', () => {
      const filter = createFilter(['特效药']);
      const result = maskKeywords(filter, '买特效药吧');
      assert.strictEqual(result, '买***吧');
    });
  });

  describe('filterText()', () => {
    it('should return safe=true for clean text', () => {
      const filter = createFilter(['fraud', 'scam']);
      const result = filterText(filter, 'this is clean');
      assert.strictEqual(result.safe, true);
      assert.deepStrictEqual(result.keywords, []);
      assert.strictEqual(result.filtered, 'this is clean');
    });

    it('should return safe=false for text with keywords', () => {
      const filter = createFilter(['fraud']);
      const result = filterText(filter, 'this is fraud');
      assert.strictEqual(result.safe, false);
      assert.deepStrictEqual(result.keywords, ['fraud']);
      assert.strictEqual(result.filtered, 'this is *****');
    });

    it('should handle empty text', () => {
      const filter = createFilter(['fraud']);
      const result = filterText(filter, '');
      assert.strictEqual(result.safe, true);
      assert.deepStrictEqual(result.keywords, []);
    });

    it('should handle null text', () => {
      const filter = createFilter(['fraud']);
      const result = filterText(filter, null);
      assert.strictEqual(result.safe, true);
      assert.deepStrictEqual(result.keywords, []);
    });

    it('should handle whitespace-only text', () => {
      const filter = createFilter(['fraud']);
      const result = filterText(filter, '   ');
      assert.strictEqual(result.safe, true);
    });

    it('should detect and mask multiple keywords', () => {
      const filter = createFilter(['虚假', '诈骗', '赌博']);
      const result = filterText(filter, '虚假广告和诈骗信息');
      assert.strictEqual(result.safe, false);
      assert(result.keywords.includes('虚假'));
      assert(result.keywords.includes('诈骗'));
      assert.strictEqual(result.filtered, '**广告和**信息');
    });

    it('should handle real-world sensitive word list', () => {
      const words = [
        '特效药', '包治百病', '虚假疗法', '神医', '祖传秘方',
        '传销', '诈骗', '赌博', '色情',
      ];
      const filter = createFilter(words);

      const safe = filterText(filter, '今天做了康复训练，感觉好多了');
      assert.strictEqual(safe.safe, true);

      const unsafe = filterText(filter, '我发现一个神医，有祖传秘方');
      assert.strictEqual(unsafe.safe, false);
      assert(unsafe.keywords.includes('神医'));
      assert(unsafe.keywords.includes('祖传秘方'));
    });
  });
});
