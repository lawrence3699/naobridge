'use strict';

module.exports = app => {
  const { INTEGER } = app.Sequelize;

  const PostLike = app.model.define('post_likes', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    postId: {
      type: INTEGER,
      defaultValue: null,
      references: {
        model: 'posts',
        key: 'id',
      },
    },
    postCommentId: {
      type: INTEGER,
      defaultValue: null,
      references: {
        model: 'post_comments',
        key: 'id',
      },
    },
  }, {
    tableName: 'post_likes',
    timestamps: true,
  });

  PostLike.associate = function() {
    PostLike.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    PostLike.belongsTo(app.model.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
    PostLike.belongsTo(app.model.PostComment, {
      foreignKey: 'postCommentId',
      as: 'comment',
    });
  };

  return PostLike;
};
