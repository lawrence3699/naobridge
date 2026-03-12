'use strict';

/**
 * Application routes.
 * Maps HTTP methods + paths to controller actions.
 * Applies auth and checkStatus middleware where required.
 *
 * @param {import('egg').Application} app - Egg application instance
 */
module.exports = app => {
  const { router, controller, middleware } = app;

  const auth = middleware.auth();
  const checkStatus = middleware.checkStatus();

  // ─── Auth ──────────────────────────────────────────────
  router.post('/api/v1/register', controller.user.register);
  router.post('/api/v1/login', controller.user.login);

  // ─── User ──────────────────────────────────────────────
  router.get('/api/v1/user/me', auth, controller.user.me);
  router.put('/api/v1/user/me', auth, controller.user.updateProfile);
  router.get('/api/v1/users/:userId', controller.user.profile);
  router.post('/api/v1/users/:userId/follow', auth, controller.user.follow);

  // ─── Posts ─────────────────────────────────────────────
  router.post('/api/v1/posts', auth, checkStatus, controller.post.create);
  router.get('/api/v1/posts', controller.post.list);
  router.get('/api/v1/posts/feed', auth, controller.post.feed);
  router.get('/api/v1/posts/:postId', controller.post.show);
  router.put('/api/v1/posts/:postId', auth, checkStatus, controller.post.update);
  router.delete('/api/v1/posts/:postId', auth, controller.post.destroy);
  router.post('/api/v1/posts/:postId/like', auth, controller.post.like);
  router.post('/api/v1/posts/:postId/report', auth, controller.post.report);
  router.post('/api/v1/posts/:postId/favorite', auth, controller.post.favorite);

  // ─── Comments ──────────────────────────────────────────
  router.post('/api/v1/posts/:postId/comments', auth, checkStatus, controller.comment.create);
  router.post('/api/v1/posts/:postId/comments/:commentId/reply', auth, checkStatus, controller.comment.reply);
  router.post('/api/v1/posts/:postId/comments/:commentId/like', auth, controller.comment.like);
  router.delete('/api/v1/posts/:postId/comments/:commentId', auth, controller.comment.destroy);

  // ─── Notifications ────────────────────────────────────
  router.get('/api/v1/notifications', auth, controller.notification.list);
  router.put('/api/v1/notifications/read-all', auth, controller.notification.markAllRead);
  router.get('/api/v1/notifications/unread-count', auth, controller.notification.unreadCount);
  router.put('/api/v1/notifications/:notificationId/read', auth, controller.notification.markRead);

  // ─── Admin ─────────────────────────────────────────────
  router.get('/api/v1/admin/stats', auth, controller.admin.stats);
  router.post('/api/v1/admin/reports/:reportId/review', auth, controller.admin.reviewReport);
  router.post('/api/v1/admin/users/:userId/mute', auth, controller.admin.muteUser);
  router.post('/api/v1/admin/users/:userId/ban', auth, controller.admin.banUser);
  router.post('/api/v1/admin/users/:userId/unmute', auth, controller.admin.unmuteUser);
  router.post('/api/v1/admin/words', auth, controller.admin.addWord);
  router.delete('/api/v1/admin/words/:wordId', auth, controller.admin.removeWord);
  router.get('/api/v1/admin/reports', auth, controller.admin.reportList);
  router.get('/api/v1/admin/content', auth, controller.admin.contentList);

  // ─── Channels ──────────────────────────────────────────
  router.get('/api/v1/channels', controller.channel.list);
  router.get('/api/v1/channels/:channelId', controller.channel.show);
};
