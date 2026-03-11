/**
 * Time formatting utilities
 */

/**
 * Format ISO date string to relative time (e.g. "3分钟前")
 * @param {string} isoString - ISO date string
 * @returns {string} relative time in Chinese
 */
function formatTimeAgo(isoString) {
  if (!isoString) return '';

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return '刚刚';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;

  // Older than 30 days — show date
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

/**
 * Format ISO date string to readable date
 * @param {string} isoString
 * @returns {string} formatted date in Chinese
 */
function formatDate(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

module.exports = {
  formatTimeAgo,
  formatDate
};
