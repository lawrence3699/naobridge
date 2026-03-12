'use strict';

const { Service } = require('egg');
const { createFilter, filterText } = require('../extend/filter');

const MAX_COMMENT_TOTAL = 500;

class CommentService extends Service {

  /**
   * Create a comment on a post
   * @param {object} params - { postId, content, postCommentId, userId }
   * @returns {object} created comment
   */
  async create({ postId, content, postCommentId, userId }) {
    const { ctx, app } = this;
    const maxCommentLength = app.config.naobridge.maxCommentLength;

    // Validate post exists and is visible
    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

    if (!post.commentEnabled) {
      ctx.throw(403, 'Comments are disabled for this post');
    }

    // Validate content length
    if (!content || content.length < 1 || content.length > maxCommentLength) {
      ctx.throw(400, `Comment must be between 1 and ${maxCommentLength} characters`);
    }

    // Run sensitive word filter
    await this._checkSensitiveWords(content);

    // If postCommentId provided, verify parent comment exists and belongs to same post
    if (postCommentId) {
      const parent = await ctx.model.PostComment.findByPk(postCommentId);
      if (!parent) {
        ctx.throw(404, 'Parent comment not found');
      }
      if (parent.postId !== postId) {
        ctx.throw(400, 'Parent comment does not belong to this post');
      }
      // Enforce 2-level max: parent must be a top-level comment
      if (parent.postCommentId !== null) {
        ctx.throw(400, 'Only 2 levels of comments are supported');
      }
    }

    const comment = await ctx.model.PostComment.create({
      userId,
      postId,
      postCommentId: postCommentId || null,
      content,
    });

    // Increment post comment count
    await ctx.model.Post.update(
      { num_comments: this.app.Sequelize.literal('num_comments + 1') },
      { where: { id: postId } }
    );

    // Return comment with user info
    const result = await ctx.model.PostComment.findByPk(comment.id, {
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'role'],
        },
      ],
    });

    return result;
  }

  /**
   * List comments for a post (top-level with nested replies)
   * @param {number} postId
   * @returns {object[]} comments with replies
   */
  async list(postId) {
    const { ctx } = this;

    const post = await ctx.model.Post.findByPk(postId);
    if (!post || !post.is_valid) {
      ctx.throw(404, 'Post not found');
    }

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
      limit: MAX_COMMENT_TOTAL,
    });

    return comments;
  }

  /**
   * Delete a comment (comment author or post author)
   * @param {number} commentId
   * @param {number} userId
   */
  async destroy(commentId, userId) {
    const { ctx } = this;

    const comment = await ctx.model.PostComment.findByPk(commentId);
    if (!comment) {
      ctx.throw(404, 'Comment not found');
    }

    // Check authorization: comment author OR post author can delete
    const post = await ctx.model.Post.findByPk(comment.postId);
    if (comment.userId !== userId && (!post || post.userId !== userId)) {
      ctx.throw(403, 'You do not have permission to delete this comment');
    }

    const { postId } = comment;

    // Count replies if this is a top-level comment
    let deleteCount = 1;
    if (comment.postCommentId === null) {
      const replyCount = await ctx.model.PostComment.count({
        where: { postCommentId: commentId },
      });
      deleteCount += replyCount;

      // Delete replies first
      await ctx.model.PostComment.destroy({
        where: { postCommentId: commentId },
      });
    }

    // Delete the comment itself
    await comment.destroy();

    // Decrement post comment count
    await ctx.model.Post.update(
      { num_comments: this.app.Sequelize.literal(`GREATEST(num_comments - ${deleteCount}, 0)`) },
      { where: { id: postId } }
    );
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

module.exports = CommentService;
