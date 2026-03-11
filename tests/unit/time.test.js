/**
 * Time utility — Unit Tests
 */
const { formatTimeAgo, formatDate } = require('../../miniprogram/utils/time');

describe('formatTimeAgo', () => {
  it('should return "刚刚" for time less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('刚刚');
  });

  it('should return minutes for time < 60 minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe('5分钟前');
  });

  it('should return hours for time < 24 hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toBe('3小时前');
  });

  it('should return days for time < 30 days ago', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatTimeAgo(fiveDaysAgo)).toBe('5天前');
  });

  it('should return month/day for time > 30 days ago', () => {
    const oldDate = new Date(Date.now() - 60 * 86400000).toISOString();
    const result = formatTimeAgo(oldDate);
    expect(result).toMatch(/\d+月\d+日/);
  });

  it('should return empty string for empty input', () => {
    expect(formatTimeAgo('')).toBe('');
    expect(formatTimeAgo(null)).toBe('');
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('should return "刚刚" for future dates', () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(formatTimeAgo(future)).toBe('刚刚');
  });
});

describe('formatDate', () => {
  it('should format date in Chinese', () => {
    const result = formatDate('2026-03-11T14:30:00.000Z');
    expect(result).toMatch(/2026年/);
    expect(result).toMatch(/3月/);
    // Date depends on timezone; just verify format
    expect(result).toMatch(/\d+日/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });
});
