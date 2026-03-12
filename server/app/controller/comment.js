'use strict';

const { Controller } = require('egg');

const CREATE_RULES = {
  content: { type: 'string', required: true, trim: true },
};

class CommentController extends Controller {
  /**
   * POST /api/v1/posts/:postId/comments
   * Create a new comment on a post.
   * Requires auth + checkStatus middleware.
   */
  async create() {
    const { ctx } = this;
    ctx.validate(CREATE_RULES, ctx.request.body);

    const userId = ctx.state.user.id;
    const { postId } = ctx.params;

    const result = await ctx.service.comment.create({
      userId,
      postId: parseInt(postId),
      content: ctx.request.body.content,
    });

    ctx.status = 201;
    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/posts/:postId/comments/:commentId/reply
   * Reply to an existing comment.
   * Requires auth + checkStatus middleware.
   */
  async reply() {
    const { ctx } = this;
    ctx.validate(CREATE_RULES, ctx.request.body);

    const userId = ctx.state.user.id;
    const { postId, commentId } = ctx.params;

    const result = await ctx.service.comment.create({
      userId,
      postId: parseInt(postId),
      postCommentId: parseInt(commentId),
      content: ctx.request.body.content,
    });

    ctx.status = 201;
    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * POST /api/v1/posts/:postId/comments/:commentId/like
   * Toggle like on a comment.
   * Requires auth middleware.
   */
  async like() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { commentId } = ctx.params;

    const result = await ctx.service.comment.like(commentId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * DELETE /api/v1/posts/:postId/comments/:commentId
   * Delete a comment.
   * Requires auth middleware.
   */
  async destroy() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { commentId } = ctx.params;

    const result = await ctx.service.comment.destroy(commentId, userId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }
}

module.exports = CommentController;
