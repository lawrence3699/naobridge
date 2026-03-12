'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, BOOLEAN, ENUM } = app.Sequelize;

  const Post = app.model.define('posts', {
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
    channelId: {
      type: INTEGER,
      defaultValue: null,
      references: {
        model: 'channels',
        key: 'id',
      },
    },
    title: {
      type: STRING(50),
      allowNull: false,
    },
    content: {
      type: TEXT,
      allowNull: false,
    },
    is_valid: {
      type: BOOLEAN,
      defaultValue: true,
    },
    category: {
      type: ENUM('recovery', 'bci', 'emotional', 'knowledge', 'qa', 'free'),
      defaultValue: 'free',
    },
    commentEnabled: {
      type: BOOLEAN,
      defaultValue: true,
    },
    isPinned: {
      type: BOOLEAN,
      defaultValue: false,
    },
    isFeatured: {
      type: BOOLEAN,
      defaultValue: false,
    },
    num_likes: {
      type: INTEGER,
      defaultValue: 0,
    },
    num_comments: {
      type: INTEGER,
      defaultValue: 0,
    },
    num_views: {
      type: INTEGER,
      defaultValue: 0,
    },
  }, {
    tableName: 'posts',
    timestamps: true,
    indexes: [
      { fields: ['category'] },
    ],
  });

  Post.associate = function() {
    Post.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Post.belongsTo(app.model.Channel, {
      foreignKey: 'channelId',
      as: 'channel',
    });
    Post.hasMany(app.model.PostComment, {
      foreignKey: 'postId',
      as: 'comments',
    });
    Post.hasMany(app.model.PostLike, {
      foreignKey: 'postId',
      as: 'likes',
    });
    Post.hasMany(app.model.PostImage, {
      foreignKey: 'postId',
      as: 'images',
    });
    Post.hasMany(app.model.PostFeedback, {
      foreignKey: 'postId',
      as: 'feedbacks',
    });
    Post.hasMany(app.model.Favorite, {
      foreignKey: 'postId',
      as: 'favorites',
    });
  };

  return Post;
};
