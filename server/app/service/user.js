'use strict';

const { Service } = require('egg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createFilter, filterText } = require('../extend/filter');

const VALID_ROLES = ['patient', 'family', 'supporter'];
const SALT_ROUNDS = 10;

class UserService extends Service {

  /**
   * Register a new user with profile
   * @param {object} params - { name, email, password, avatar, role }
   * @returns {{ user: object, token: string }}
   */
  async register({ name, email, password, avatar, role }) {
    const { ctx } = this;

    if (!name || !email || !password) {
      ctx.throw(400, 'name, email, and password are required');
    }

    if (role && !VALID_ROLES.includes(role)) {
      ctx.throw(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const existing = await ctx.model.User.findOne({ where: { email } });
    if (existing) {
      ctx.throw(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const transaction = await ctx.model.transaction();
    try {
      const user = await ctx.model.User.create({
        name,
        email,
        password: hashedPassword,
        avatar: avatar || null,
        role: role || 'supporter',
      }, { transaction });

      await ctx.model.Userprofile.create({
        userId: user.id,
      }, { transaction });

      await transaction.commit();

      const token = this.generateToken(user);
      const userData = user.toJSON();
      delete userData.password;

      return { user: userData, token };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Authenticate user by email and password
   * @param {object} params - { email, password }
   * @returns {{ user: object, token: string }}
   */
  async login({ email, password }) {
    const { ctx } = this;

    if (!email || !password) {
      ctx.throw(400, 'email and password are required');
    }

    const user = await ctx.model.User.findOne({ where: { email } });
    if (!user) {
      ctx.throw(401, 'Invalid email or password');
    }

    if (user.status === 'banned') {
      ctx.throw(403, 'Account has been banned');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      ctx.throw(401, 'Invalid email or password');
    }

    const token = this.generateToken(user);
    const userData = user.toJSON();
    delete userData.password;

    return { user: userData, token };
  }

  /**
   * Get user profile with follower/following/post counts
   * @param {number} userId
   * @returns {object} user profile data
   */
  async getProfile(userId) {
    const { ctx } = this;

    const user = await ctx.model.User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: ctx.model.Userprofile, as: 'profile' },
      ],
    });

    if (!user) {
      ctx.throw(404, 'User not found');
    }

    const [followersCount, followingsCount, postsCount] = await Promise.all([
      ctx.model.UserFollow.count({ where: { followingId: userId } }),
      ctx.model.UserFollow.count({ where: { followerId: userId } }),
      ctx.model.Post.count({ where: { userId, is_valid: true } }),
    ]);

    const userData = user.toJSON();
    return {
      ...userData,
      followersCount,
      followingsCount,
      postsCount,
    };
  }

  /**
   * Update user profile fields
   * @param {number} userId
   * @param {object} updates - { name, avatar, about_me, city }
   * @returns {object} updated user data
   */
  async updateProfile(userId, updates) {
    const { ctx, app } = this;
    const maxNicknameLength = app.config.naobridge.maxNicknameLength;

    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      ctx.throw(404, 'User not found');
    }

    if (updates.name !== undefined && updates.name.length > maxNicknameLength) {
      ctx.throw(400, `Nickname must not exceed ${maxNicknameLength} characters`);
    }

    const userFields = {};
    if (updates.name !== undefined) userFields.name = updates.name;
    if (updates.avatar !== undefined) userFields.avatar = updates.avatar;

    const profileFields = {};
    if (updates.about_me !== undefined) profileFields.about_me = updates.about_me;
    if (updates.city !== undefined) profileFields.city = updates.city;

    const transaction = await ctx.model.transaction();
    try {
      if (Object.keys(userFields).length > 0) {
        await ctx.model.User.update(userFields, {
          where: { id: userId },
          transaction,
        });
      }

      if (Object.keys(profileFields).length > 0) {
        await ctx.model.Userprofile.update(profileFields, {
          where: { userId },
          transaction,
        });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return this.getProfile(userId);
  }

  /**
   * Toggle follow/unfollow on a user
   * @param {number} followerId - current user id
   * @param {number} followingId - user id to follow/unfollow
   * @returns {{ followed: boolean }}
   */
  async follow(followerId, followingId) {
    const { ctx } = this;

    if (String(followerId) === String(followingId)) {
      ctx.throw(400, 'You cannot follow yourself');
    }

    const target = await ctx.model.User.findByPk(followingId);
    if (!target) {
      ctx.throw(404, 'User not found');
    }

    const existing = await ctx.model.UserFollow.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      await existing.destroy();
      return { followed: false };
    }

    await ctx.model.UserFollow.create({ followerId, followingId });
    return { followed: true };
  }

  /**
   * WeChat login: exchange code for openid, look up user
   * @param {string} code - wx.login temporary code
   * @returns {{ isNewUser: boolean, user?: object, token?: string }}
   */
  async wxLogin(code) {
    const { ctx } = this;

    const { openid } = await ctx.service.wechat.code2Session(code);

    const user = await ctx.model.User.findOne({ where: { openid } });

    if (!user) {
      return { isNewUser: true };
    }

    if (user.status === 'banned') {
      ctx.throw(403, 'Account has been banned');
    }

    const token = this.generateToken(user);
    const userData = user.toJSON();
    delete userData.password;

    return { isNewUser: false, user: userData, token };
  }

  /**
   * WeChat register: create user with openid
   * @param {object} params - { code, name, role }
   * @returns {{ user: object, token: string }}
   */
  async wxRegister({ code, name, role }) {
    const { ctx } = this;

    if (!name) {
      ctx.throw(400, 'name is required');
    }

    if (role && !VALID_ROLES.includes(role)) {
      ctx.throw(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    // Check sensitive words in nickname
    const wordRecords = await ctx.model.SensitiveWord.findAll();
    const words = wordRecords.map(r => r.word);
    if (words.length > 0) {
      const filter = createFilter(words);
      const result = filterText(filter, name);
      if (!result.safe) {
        ctx.throw(400, `Content contains prohibited words: ${result.keywords.join(', ')}`);
      }
    }

    const { openid } = await ctx.service.wechat.code2Session(code);

    const existing = await ctx.model.User.findOne({ where: { openid } });
    if (existing) {
      ctx.throw(409, 'Account already exists for this WeChat user');
    }

    // Generate placeholder email and password for openid-based users
    const email = `wx_${openid}@wechat.local`;
    const hashedPassword = await bcrypt.hash(`wx_${openid}_${Date.now()}`, SALT_ROUNDS);

    const transaction = await ctx.model.transaction();
    try {
      const user = await ctx.model.User.create({
        name,
        email,
        password: hashedPassword,
        openid,
        role: role || 'supporter',
      }, { transaction });

      await ctx.model.Userprofile.create({
        userId: user.id,
      }, { transaction });

      await transaction.commit();

      const token = this.generateToken(user);
      const userData = user.toJSON();
      delete userData.password;

      return { user: userData, token };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Generate a JWT token for the given user
   * @param {object} user - user model instance or plain object
   * @returns {string} signed JWT
   */
  generateToken(user) {
    const { app } = this;
    const { secret, expiresIn } = app.config.jwt;

    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    return jwt.sign(payload, secret, { expiresIn });
  }
}

module.exports = UserService;
