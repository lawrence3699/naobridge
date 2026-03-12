'use strict';

const { Service } = require('egg');
const { createFilter, filterText } = require('../extend/filter');

const VALID_CATEGORIES = ['recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'];
const MAX_IMAGES = 9;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

class PostService extends Service {

  /**
   * Create a new post with images
   * @param {object} params - { content, title, category, images, userId }
   * @returns {object} created post with images
   */
  async create({ content, title, category, images, userId }) {
    const { ctx, app } = this;
    const { minContentLength, maxContentLength } = app.config.naobridge;

    if (!title || !title.trim()) {
      ctx.throw(400, 'Title is required');
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      ctx.throw(400, `Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (!content || content.length < minContentLength || content.length > maxContentLength) {
      ctx.throw(400, `Content must be between ${minContentLength} and ${maxContentLength} characters`);
    }

    if (images && images.length > MAX_IMAGES) {
      ctx.throw(400, `Maximum ${MAX_IMAGES} images allowed per post`);
    }

    await this._checkSensitiveWords(`${title} ${content}`);

    const transaction = await ctx.model.transaction();
    try {
      const post = await ctx.model.Post.create({
        userId,
        title: title.trim(),
        content,
        category,
      }, { transaction });

      if (images && images.length > 0) {
        const imageRecords = images.map(url => ({
          postId: post.id,
          userId,
          url,
        }));
        await ctx.model.PostImage.bulkCreate(imageRecords, { transaction });
      }

      await transaction.commit();

      return this.show(post.id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * List posts with pagination and optional category filter
   * @param {object} params - { category, page, pageSize }
   * @returns {{ rows: object[], count: number, page: number, pageSize: number }}
   */
  async list({ category, page, pageSize }) {
    const { ctx } = this;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (currentPage - 1) * limit;

    const where = { is_valid: true };
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    const { rows, count } = await ctx.model.Post.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'role'],
        },
        {
          model: ctx.model.PostImage,
          as: 'images',
          attributes: ['id', 'url'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return {
      rows,
      count,
      page: currentPage,
      pageSize: limit,
    };
  }

  /**
   * Get a single post with user, images, and comments (2-level)
   * @param {number} postId
   * @returns {{ post: object, comments: object[] }}
   */
  async show(postId) {
    const { ctx } = this;

    const post = await ctx.model.Post.findByPk(postId, {
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'role'],
        },
        {
          model: ctx.model.PostImage,
          as: 'images',
          attributes: ['id', 'url'],
        },
      ],
    });

    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    // Increment view count without blocking response
    await ctx.model.Post.update(
      { num_views: this.app.Sequelize.literal('num_views + 1') },
      { where: { id: postId } }
    );

    // Get top-level comments with replies (2-level)
    const comments = await ctx.model.PostComment.findAll({
      where: { postId, postCommentId: null },
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'role'],
        },
        {
          model: ctx.model.PostComment,
          as: 'replies',
          include: [
            {
              model: ctx.model.User,
              as: 'user',
              attributes: ['id', 'name', 'avatar', 'role'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return { post, comments };
  }

  /**
   * Update a post (owner only)
   * @param {number} postId
   * @param {number} userId
   * @param {object} updates - { title, content, category }
   * @returns {object} updated post
   */
  async update(postId, userId, updates) {
    const { ctx, app } = this;

    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    if (post.userId !== userId) {
      ctx.throw(403, 'You can only edit your own posts');
    }

    const fields = {};

    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        ctx.throw(400, 'Title cannot be empty');
      }
      fields.title = updates.title.trim();
    }

    if (updates.content !== undefined) {
      const { minContentLength, maxContentLength } = app.config.naobridge;
      if (updates.content.length < minContentLength || updates.content.length > maxContentLength) {
        ctx.throw(400, `Content must be between ${minContentLength} and ${maxContentLength} characters`);
      }
      fields.content = updates.content;
    }

    if (updates.category !== undefined) {
      if (!VALID_CATEGORIES.includes(updates.category)) {
        ctx.throw(400, `Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      fields.category = updates.category;
    }

    // Run sensitive filter on new content
    const textToCheck = [
      fields.title || '',
      fields.content || '',
    ].filter(Boolean).join(' ');

    if (textToCheck.trim()) {
      await this._checkSensitiveWords(textToCheck);
    }

    await ctx.model.Post.update(fields, { where: { id: postId } });

    return this.show(postId);
  }

  /**
   * Soft-delete a post (owner only)
   * @param {number} postId
   * @param {number} userId
   */
  async destroy(postId, userId) {
    const { ctx } = this;

    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    if (post.userId !== userId) {
      ctx.throw(403, 'You can only delete your own posts');
    }

    await ctx.model.Post.update(
      { is_valid: false },
      { where: { id: postId } }
    );
  }

  /**
   * Toggle like on a post
   * @param {number} postId
   * @param {number} userId
   * @returns {{ liked: boolean, num_likes: number }}
   */
  async like(postId, userId) {
    const { ctx } = this;

    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    const existing = await ctx.model.PostLike.findOne({
      where: { postId, userId, postCommentId: null },
    });

    if (existing) {
      await existing.destroy();
      await ctx.model.Post.update(
        { num_likes: this.app.Sequelize.literal('GREATEST(num_likes - 1, 0)') },
        { where: { id: postId } }
      );
      const updated = await ctx.model.Post.findByPk(postId);
      return { liked: false, num_likes: updated.num_likes };
    }

    await ctx.model.PostLike.create({ postId, userId, postCommentId: null });
    await ctx.model.Post.update(
      { num_likes: this.app.Sequelize.literal('num_likes + 1') },
      { where: { id: postId } }
    );
    const updated = await ctx.model.Post.findByPk(postId);
    return { liked: true, num_likes: updated.num_likes };
  }

  /**
   * Toggle favorite on a post
   * @param {number} postId
   * @param {number} userId
   * @returns {{ favorited: boolean }}
   */
  async favorite(postId, userId) {
    const { ctx } = this;

    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    const existing = await ctx.model.Favorite.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await existing.destroy();
      return { favorited: false };
    }

    await ctx.model.Favorite.create({ postId, userId });
    return { favorited: true };
  }

  /**
   * Load sensitive words and check text against them
   * @param {string} text - text to check
   * @private
   */
  async _checkSensitiveWords(text) {
    const { ctx } = this;

    const wordRecords = await ctx.model.SensitiveWord.findAll();
    const words = wordRecords.map(r => r.word);

    if (words.length === 0) {
      return;
    }

    const filter = createFilter(words);
    const result = filterText(filter, text);

    if (!result.safe) {
      ctx.throw(400, `Content contains prohibited words: ${result.keywords.join(', ')}`);
    }
  }
}

module.exports = PostService;
