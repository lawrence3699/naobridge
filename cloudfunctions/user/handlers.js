/**
 * User Handlers — pure business logic, testable without cloud env
 * All handlers accept (params, db) for dependency injection
 */

const VALID_ROLES = ['patient', 'family', 'supporter'];
const MAX_NICKNAME_LENGTH = 20;

/**
 * Strip sensitive fields from user object before returning to client
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { _openid, ...safe } = user;
  return safe;
}

/**
 * Handle login — check if user exists
 */
async function handleLogin(params, db) {
  const { openid } = params || {};

  if (!openid) {
    return { code: 1001, data: null, message: '缺少必要参数：openid' };
  }

  const { data: users } = await db.collection('users').where({ _openid: openid }).get();

  if (users.length === 0) {
    return {
      code: 0,
      data: { isNewUser: true, user: null },
      message: ''
    };
  }

  const user = users[0];

  if (user.status === 'banned') {
    return {
      code: 1002,
      data: null,
      message: '您的账号已被封禁，如有疑问请联系管理员'
    };
  }

  return {
    code: 0,
    data: { isNewUser: false, user: sanitizeUser(user) },
    message: ''
  };
}

/**
 * Handle register — create new user profile
 */
async function handleRegister(params, db) {
  const { openid, nickName, role, avatarUrl = '' } = params || {};

  if (!openid) {
    return { code: 1001, data: null, message: '缺少必要参数：openid' };
  }

  if (!nickName || !nickName.trim()) {
    return { code: 1001, data: null, message: '请填写昵称' };
  }

  const trimmedName = nickName.trim();

  if (trimmedName.length > MAX_NICKNAME_LENGTH) {
    return { code: 1001, data: null, message: `昵称不能超过${MAX_NICKNAME_LENGTH}个字符` };
  }

  if (!VALID_ROLES.includes(role)) {
    return { code: 1001, data: null, message: '请选择有效的身份标签：患者本人、家属、关注者' };
  }

  // Check for duplicate registration
  const { data: existing } = await db.collection('users').where({ _openid: openid }).get();
  if (existing.length > 0) {
    return { code: 1001, data: null, message: '该用户已注册' };
  }

  const now = new Date().toISOString();
  const newUser = {
    _openid: openid,
    nickName: trimmedName,
    role,
    avatarUrl,
    status: 'normal',
    agreedToRules: true,
    createdAt: now,
    updatedAt: now
  };

  const { _id } = await db.collection('users').add({ data: newUser });

  return {
    code: 0,
    data: { user: sanitizeUser({ _id, ...newUser }) },
    message: ''
  };
}

/**
 * Handle getProfile — fetch user by openid
 */
async function handleGetProfile(params, db) {
  const { openid } = params || {};

  if (!openid) {
    return { code: 1001, data: null, message: '缺少必要参数：openid' };
  }

  const { data: users } = await db.collection('users').where({ _openid: openid }).get();

  if (users.length === 0) {
    return { code: 1003, data: null, message: '用户不存在' };
  }

  return {
    code: 0,
    data: sanitizeUser(users[0]),
    message: ''
  };
}

/**
 * Handle updateProfile — update nickName or avatarUrl
 */
async function handleUpdateProfile(params, db) {
  const { openid, nickName, avatarUrl } = params || {};

  if (!openid) {
    return { code: 1001, data: null, message: '缺少必要参数：openid' };
  }

  const { data: users } = await db.collection('users').where({ _openid: openid }).get();

  if (users.length === 0) {
    return { code: 1003, data: null, message: '用户不存在' };
  }

  const user = users[0];

  // Check mute/ban status
  if (user.status === 'banned') {
    return { code: 1002, data: null, message: '您的账号已被封禁' };
  }

  if (user.status === 'muted') {
    const muteExpiry = user.muteExpiry ? new Date(user.muteExpiry) : null;
    if (muteExpiry && muteExpiry > new Date()) {
      return { code: 1002, data: null, message: '您的账号已被禁言，暂时无法修改资料' };
    }
  }

  // Build update fields (only allowed fields)
  const updateData = { updatedAt: new Date().toISOString() };

  if (nickName !== undefined) {
    const trimmed = (nickName || '').trim();
    if (!trimmed) {
      return { code: 1001, data: null, message: '昵称不能为空' };
    }
    if (trimmed.length > MAX_NICKNAME_LENGTH) {
      return { code: 1001, data: null, message: `昵称不能超过${MAX_NICKNAME_LENGTH}个字符` };
    }
    updateData.nickName = trimmed;
  }

  if (avatarUrl !== undefined) {
    updateData.avatarUrl = avatarUrl;
  }

  await db.collection('users').where({ _openid: openid }).update({ data: updateData });

  return {
    code: 0,
    data: null,
    message: ''
  };
}

module.exports = {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile
};
