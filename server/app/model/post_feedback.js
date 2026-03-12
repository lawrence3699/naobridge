'use strict';

module.exports = app => {
  const { STRING, INTEGER, ENUM } = app.Sequelize;

  const PostFeedback = app.model.define('post_feedbacks', {
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
    subject: {
      type: STRING(50),
      allowNull: false,
    },
    reason: {
      type: ENUM('medical-fraud', 'ad-spam', 'harassment', 'violence', 'other'),
      defaultValue: 'other',
    },
    description: {
      type: STRING(500),
      defaultValue: null,
    },
    targetType: {
      type: ENUM('post', 'comment', 'user'),
      defaultValue: 'post',
    },
    targetId: {
      type: INTEGER,
      defaultValue: null,
    },
    status: {
      type: ENUM('PENDING', 'PROCESSED', 'REFUSED'),
      defaultValue: 'PENDING',
    },
    handlerId: {
      type: INTEGER,
      defaultValue: null,
    },
    result: {
      type: STRING(255),
      defaultValue: null,
    },
  }, {
    tableName: 'post_feedbacks',
    timestamps: true,
  });

  PostFeedback.associate = function() {
    PostFeedback.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    PostFeedback.belongsTo(app.model.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
  };

  return PostFeedback;
};
