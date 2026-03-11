/**
 * User Cloud Function — Unit Tests
 * Covers: login, register (profile setup), getProfile, updateProfile
 */
const {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile
} = require('../../cloudfunctions/user/handlers');

// Mock database helpers
function createMockDb() {
  const store = {};

  return {
    store,
    collection(name) {
      if (!store[name]) store[name] = [];
      const col = store[name];

      return {
        where(query) {
          return {
            async get() {
              const data = col.filter(item =>
                Object.entries(query).every(([k, v]) => item[k] === v)
              );
              return { data };
            },
            async update({ data }) {
              let updated = 0;
              for (const item of col) {
                if (Object.entries(query).every(([k, v]) => item[k] === v)) {
                  Object.assign(item, data);
                  updated++;
                }
              }
              return { stats: { updated } };
            }
          };
        },
        async add({ data }) {
          const newItem = { _id: `id_${col.length + 1}`, ...data };
          col.push(newItem);
          return { _id: newItem._id };
        },
        doc(id) {
          return {
            async get() {
              const item = col.find(i => i._id === id);
              if (!item) throw new Error('document not found');
              return { data: item };
            }
          };
        }
      };
    }
  };
}

describe('handleLogin', () => {
  it('should return existing user profile if already registered', async () => {
    const db = createMockDb();
    db.store.users = [
      {
        _id: 'u1',
        _openid: 'openid_123',
        nickName: '康复小战士',
        role: 'patient',
        avatarUrl: '',
        status: 'normal',
        agreedToRules: true,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    const result = await handleLogin({ openid: 'openid_123' }, db);

    expect(result.code).toBe(0);
    expect(result.data.isNewUser).toBe(false);
    expect(result.data.user.nickName).toBe('康复小战士');
    expect(result.data.user._openid).toBeUndefined();
  });

  it('should return isNewUser:true if user not found', async () => {
    const db = createMockDb();
    db.store.users = [];

    const result = await handleLogin({ openid: 'openid_new' }, db);

    expect(result.code).toBe(0);
    expect(result.data.isNewUser).toBe(true);
    expect(result.data.user).toBeNull();
  });

  it('should return error 1001 if openid is missing', async () => {
    const db = createMockDb();
    const result = await handleLogin({}, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('openid');
  });

  it('should not expose _openid in returned user data', async () => {
    const db = createMockDb();
    db.store.users = [
      {
        _id: 'u1',
        _openid: 'openid_123',
        nickName: 'Test',
        role: 'patient',
        status: 'normal',
        agreedToRules: true,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    const result = await handleLogin({ openid: 'openid_123' }, db);
    expect(result.data.user._openid).toBeUndefined();
  });

  it('should return error for banned user', async () => {
    const db = createMockDb();
    db.store.users = [
      {
        _id: 'u1',
        _openid: 'openid_banned',
        nickName: 'Banned',
        role: 'patient',
        status: 'banned',
        agreedToRules: true,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    const result = await handleLogin({ openid: 'openid_banned' }, db);
    expect(result.code).toBe(1002);
    expect(result.message).toContain('封禁');
  });
});

describe('handleRegister', () => {
  it('should create new user with valid params', async () => {
    const db = createMockDb();
    db.store.users = [];

    const result = await handleRegister({
      openid: 'openid_new',
      nickName: '新用户',
      role: 'patient',
      avatarUrl: ''
    }, db);

    expect(result.code).toBe(0);
    expect(result.data.user.nickName).toBe('新用户');
    expect(result.data.user.role).toBe('patient');
    expect(result.data.user.status).toBe('normal');
    expect(result.data.user.agreedToRules).toBe(true);
    expect(db.store.users).toHaveLength(1);
  });

  it('should return error 1001 if nickName is missing', async () => {
    const db = createMockDb();
    const result = await handleRegister({
      openid: 'openid_new',
      role: 'patient'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('昵称');
  });

  it('should return error 1001 if role is invalid', async () => {
    const db = createMockDb();
    const result = await handleRegister({
      openid: 'openid_new',
      nickName: '新用户',
      role: 'admin'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('身份标签');
  });

  it('should accept valid roles: patient, family, supporter', async () => {
    const db = createMockDb();

    for (const role of ['patient', 'family', 'supporter']) {
      const result = await handleRegister({
        openid: `openid_${role}`,
        nickName: `用户_${role}`,
        role
      }, db);
      expect(result.code).toBe(0);
    }

    expect(db.store.users).toHaveLength(3);
  });

  it('should prevent duplicate registration', async () => {
    const db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'openid_existing', nickName: 'Old', role: 'patient', status: 'normal' }
    ];

    const result = await handleRegister({
      openid: 'openid_existing',
      nickName: '新名字',
      role: 'patient'
    }, db);

    expect(result.code).toBe(1001);
    expect(result.message).toContain('已注册');
  });

  it('should trim and validate nickName length', async () => {
    const db = createMockDb();

    const tooLong = await handleRegister({
      openid: 'openid_1',
      nickName: '一'.repeat(21),
      role: 'patient'
    }, db);
    expect(tooLong.code).toBe(1001);

    const tooShort = await handleRegister({
      openid: 'openid_2',
      nickName: '',
      role: 'patient'
    }, db);
    expect(tooShort.code).toBe(1001);
  });

  it('should not expose _openid in returned user data', async () => {
    const db = createMockDb();
    const result = await handleRegister({
      openid: 'openid_new',
      nickName: '安全测试',
      role: 'patient'
    }, db);

    expect(result.data.user._openid).toBeUndefined();
  });
});

describe('handleGetProfile', () => {
  it('should return user profile by openid', async () => {
    const db = createMockDb();
    db.store.users = [
      {
        _id: 'u1',
        _openid: 'openid_123',
        nickName: '测试用户',
        role: 'family',
        avatarUrl: 'https://example.com/avatar.jpg',
        status: 'normal',
        agreedToRules: true,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    const result = await handleGetProfile({ openid: 'openid_123' }, db);

    expect(result.code).toBe(0);
    expect(result.data.nickName).toBe('测试用户');
    expect(result.data.role).toBe('family');
    expect(result.data._openid).toBeUndefined();
  });

  it('should return 1003 if user not found', async () => {
    const db = createMockDb();
    db.store.users = [];

    const result = await handleGetProfile({ openid: 'nonexistent' }, db);
    expect(result.code).toBe(1003);
  });

  it('should return error 1001 if openid missing', async () => {
    const db = createMockDb();
    const result = await handleGetProfile({}, db);
    expect(result.code).toBe(1001);
  });
});

describe('handleUpdateProfile', () => {
  it('should update nickName', async () => {
    const db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'openid_123', nickName: '旧名字', role: 'patient', status: 'normal' }
    ];

    const result = await handleUpdateProfile({
      openid: 'openid_123',
      nickName: '新名字'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.users[0].nickName).toBe('新名字');
  });

  it('should update avatarUrl', async () => {
    const db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'openid_123', nickName: 'Test', role: 'patient', status: 'normal', avatarUrl: '' }
    ];

    const result = await handleUpdateProfile({
      openid: 'openid_123',
      avatarUrl: 'https://example.com/new-avatar.jpg'
    }, db);

    expect(result.code).toBe(0);
    expect(db.store.users[0].avatarUrl).toBe('https://example.com/new-avatar.jpg');
  });

  it('should not allow updating role', async () => {
    const db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'openid_123', nickName: 'Test', role: 'patient', status: 'normal' }
    ];

    const result = await handleUpdateProfile({
      openid: 'openid_123',
      role: 'family'
    }, db);

    // role should NOT change
    expect(db.store.users[0].role).toBe('patient');
  });

  it('should return error 1003 if user not found', async () => {
    const db = createMockDb();
    db.store.users = [];

    const result = await handleUpdateProfile({
      openid: 'nonexistent',
      nickName: '不存在'
    }, db);

    expect(result.code).toBe(1003);
  });

  it('should validate nickName length on update', async () => {
    const db = createMockDb();
    db.store.users = [
      { _id: 'u1', _openid: 'openid_123', nickName: 'Test', role: 'patient', status: 'normal' }
    ];

    const result = await handleUpdateProfile({
      openid: 'openid_123',
      nickName: '一'.repeat(21)
    }, db);

    expect(result.code).toBe(1001);
  });

  it('should not allow muted user to update profile', async () => {
    const db = createMockDb();
    db.store.users = [
      {
        _id: 'u1',
        _openid: 'openid_muted',
        nickName: 'Muted',
        role: 'patient',
        status: 'muted',
        muteExpiry: new Date(Date.now() + 86400000).toISOString()
      }
    ];

    const result = await handleUpdateProfile({
      openid: 'openid_muted',
      nickName: '新名字'
    }, db);

    expect(result.code).toBe(1002);
  });
});
