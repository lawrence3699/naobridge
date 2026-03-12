'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const PostComment = app.model.define('post_comments', {
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
      allowNull: false,
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
    content: {
      type: STRING(500),
      allowNull: false,
    },
    num_likes: {
      type: INTEGER,
      defaultValue: 0,
    },
  }, {
    tableName: 'post_comments',
    timestamps: true,
  });

  PostComment.associate = function() {
    PostComment.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    PostComment.belongsTo(app.model.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
    PostComment.belongsTo(PostComment, {
      foreignKey: 'postCommentId',
      as: 'parent',
    });
    PostComment.hasMany(PostComment, {
      foreignKey: 'postCommentId',
      as: 'replies',
    });
    PostComment.hasMany(app.model.PostLike, {
      foreignKey: 'postCommentId',
      as: 'likes',
    });
  };

  return PostComment;
};
