/**
 * Admin Dashboard — Client-side logic
 * Uses WeChat Cloud Function HTTP API for data access
 * Note: In production, this would authenticate via WeChat admin login
 */

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    // Show corresponding page
    const pageName = item.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`).classList.add('active');
  });
});

// Category labels
const CATEGORY_LABELS = {
  ad: '广告',
  fraud: '诈骗',
  discrimination: '歧视',
  'medical-fraud': '虚假医疗',
  violence: '暴力'
};

const REASON_LABELS = {
  'medical-fraud': '虚假医疗信息',
  'ad-spam': '广告/诈骗',
  harassment: '人身攻击/歧视',
  violence: '色情/暴力',
  other: '其他'
};

const ROLE_LABELS = {
  patient: '患者本人',
  family: '家属',
  supporter: '关注者'
};

const POST_CATEGORY_LABELS = {
  recovery: '康复日记',
  bci: '脑机接口',
  emotional: '情感互助',
  knowledge: '知识科普',
  qa: '求助问答',
  free: '自由话题'
};

/**
 * Mock API — in production, replace with actual cloud function calls
 * This provides the interface for when the dashboard connects to real data
 */
const adminApi = {
  async callAdmin(action, params) {
    // In production: call cloud function via HTTP API
    // For now, return placeholder to demonstrate the interface
    console.log(`Admin API call: ${action}`, params);
    return { code: 0, data: null, message: '' };
  }
};

// Status badge helper
function statusBadge(status) {
  const labels = {
    pending: '待处理',
    resolved: '已处理',
    dismissed: '已驳回',
    normal: '正常',
    muted: '已禁言',
    banned: '已封禁',
    hidden: '已隐藏',
    deleted: '已删除'
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

// Format date
function formatDate(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Placeholder data for demonstration
function loadDashboardStats() {
  document.getElementById('stat-users').textContent = '0';
  document.getElementById('stat-posts').textContent = '0';
  document.getElementById('stat-comments').textContent = '0';
  document.getElementById('stat-reports').textContent = '0';
}

// Initialize
loadDashboardStats();
