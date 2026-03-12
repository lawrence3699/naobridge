'use strict';

/**
 * Trie-based Sensitive Word Filter
 * Pure functions — no external dependencies
 */

const END_MARKER = Symbol('END');

/**
 * Build a Trie node from a list of sensitive words
 * @param {string[]} words - list of sensitive words
 * @returns {object} Trie root node
 */
function createFilter(words) {
  const root = {};

  for (const word of words) {
    if (!word) continue;
    const normalized = word.toLowerCase();
    let node = root;
    for (const char of normalized) {
      if (!node[char]) {
        node[char] = {};
      }
      node = node[char];
    }
    node[END_MARKER] = word;
  }

  return root;
}

/**
 * Detect all sensitive keywords in text
 * @param {object} filter - Trie root from createFilter
 * @param {string} text - text to scan
 * @returns {string[]} list of matched keywords (original casing from word list)
 */
function detectKeywords(filter, text) {
  if (!text) return [];

  const normalized = text.toLowerCase();
  const found = new Set();

  for (let i = 0; i < normalized.length; i++) {
    let node = filter;
    for (let j = i; j < normalized.length; j++) {
      const char = normalized[j];
      if (!node[char]) break;
      node = node[char];
      if (node[END_MARKER]) {
        found.add(node[END_MARKER]);
      }
    }
  }

  return Array.from(found);
}

/**
 * Replace sensitive keywords in text with asterisks
 * @param {object} filter - Trie root from createFilter
 * @param {string} text - text to mask
 * @returns {string} text with keywords replaced by asterisks
 */
function maskKeywords(filter, text) {
  if (!text) return '';

  const normalized = text.toLowerCase();
  const chars = Array.from(text);
  const maskedPositions = new Set();

  for (let i = 0; i < normalized.length; i++) {
    let node = filter;
    let matchEnd = -1;

    for (let j = i; j < normalized.length; j++) {
      const char = normalized[j];
      if (!node[char]) break;
      node = node[char];
      if (node[END_MARKER]) {
        matchEnd = j;
      }
    }

    if (matchEnd >= 0) {
      for (let k = i; k <= matchEnd; k++) {
        maskedPositions.add(k);
      }
    }
  }

  return chars.map((char, idx) =>
    maskedPositions.has(idx) ? '*' : char
  ).join('');
}

/**
 * Full filter pipeline: detect + mask
 * @param {object} filter - Trie root from createFilter
 * @param {string} text - text to check
 * @returns {{ safe: boolean, keywords: string[], filtered: string }}
 */
function filterText(filter, text) {
  if (!text || !text.trim()) {
    return { safe: true, keywords: [], filtered: text || '' };
  }

  const keywords = detectKeywords(filter, text);
  const filtered = keywords.length > 0 ? maskKeywords(filter, text) : text;

  return {
    safe: keywords.length === 0,
    keywords,
    filtered,
  };
}

module.exports = {
  createFilter,
  detectKeywords,
  maskKeywords,
  filterText,
};
