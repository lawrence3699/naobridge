'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('CommentController', () => {
  let token;
  let postId;

  before(async () => {
    await app.model.sync({ force: true });
  });

  beforeEach(async () => {
    // Register a user
    const reg = await app.httpRequest()
      .post('/api/v1/register')
      .send({ name: 'commenter', email: `commenter${Date.now()}@test.com`, password: 'password123' });
    token = reg.body.data.token;

    // Create a post
    const post = await app.httpRequest()
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Post for Comments',
        content: 'A post that will receive comments for testing.',
        category: 'qa',
      });
    postId = post.body.data.post.id;
  });

  afterEach(async () => {
    await app.model.PostComment.destroy({ where: {}, force: true });
    await app.model.PostLike.destroy({ where: {}, force: true });
    await app.model.PostImage.destroy({ where: {}, force: true });
    await app.model.Favorite.destroy({ where: {}, force: true });
    await app.model.PostFeedback.destroy({ where: {}, force: true });
    await app.model.Post.destroy({ where: {}, force: true });
    await app.model.Userprofile.destroy({ where: {}, force: true });
    await app.model.UserFollow.destroy({ where: {}, force: true });
    await app.model.SensitiveWord.destroy({ where: {}, force: true });
    await app.model.User.destroy({ where: {}, force: true });
  });

  describe('POST /api/v1/posts/:postId/comments', () => {
    it('should create a comment', async () => {
      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'This is a test comment' })
        .expect(201);

      assert(res.body.code === 0);
      assert(res.body.data.content === 'This is a test comment');
      assert(res.body.data.user);
    });

    it('should reject empty comment', async () => {
      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' })
        .expect(422);
    });

    it('should reject comment without auth', async () => {
      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .send({ content: 'no auth' })
        .expect(401);
    });

    it('should reject comment on non-existent post', async () => {
      await app.httpRequest()
        .post('/api/v1/posts/99999/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'orphan comment' })
        .expect(404);
    });

    it('should block comment with sensitive words', async () => {
      await app.model.SensitiveWord.create({ word: '赌博', category: 'fraud' });

      const res = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '来赌博吧' })
        .expect(400);

      assert(res.body.message.includes('prohibited'));
    });
  });

  describe('POST /api/v1/posts/:postId/comments/:commentId/reply', () => {
    it('should reply to a comment (2-level nesting)', async () => {
      // Create parent comment
      const parent = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Parent comment' })
        .expect(201);

      const commentId = parent.body.data.id;

      // Reply to it
      const reply = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments/${commentId}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Reply to parent' })
        .expect(201);

      assert(reply.body.code === 0);
      assert(reply.body.data.postCommentId === commentId);
    });

    it('should reject 3rd-level nesting', async () => {
      // Create parent comment
      const parent = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Level 1' })
        .expect(201);

      const parentId = parent.body.data.id;

      // Create reply (level 2)
      const reply = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments/${parentId}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Level 2' })
        .expect(201);

      const replyId = reply.body.data.id;

      // Try to reply to the reply (level 3) — should fail
      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments/${replyId}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Level 3 should fail' })
        .expect(400);
    });

    it('should reject reply to non-existent comment', async () => {
      await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments/99999/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'orphan reply' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/posts/:postId/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const comment = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'To be deleted' })
        .expect(201);

      const commentId = comment.body.data.id;

      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should reject delete by non-owner', async () => {
      const comment = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Not your comment' })
        .expect(201);

      const commentId = comment.body.data.id;

      // Register another user
      const other = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'other', email: `other${Date.now()}@test.com`, password: 'password123' });

      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${other.body.data.token}`)
        .expect(403);
    });

    it('should allow post owner to delete any comment', async () => {
      // Another user comments on the post
      const other = await app.httpRequest()
        .post('/api/v1/register')
        .send({ name: 'commenter2', email: `c2${Date.now()}@test.com`, password: 'password123' });

      const comment = await app.httpRequest()
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${other.body.data.token}`)
        .send({ content: 'Rude comment' })
        .expect(201);

      const commentId = comment.body.data.id;

      // Post owner deletes it
      await app.httpRequest()
        .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
