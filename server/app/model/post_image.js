'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const PostImage = app.model.define('post_images', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    postId: {
      type: INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id',
      },
    },
    userId: {
      type: INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    url: {
      type: STRING(255),
      allowNull: false,
    },
  }, {
    tableName: 'post_images',
    timestamps: true,
  });

  PostImage.associate = function() {
    PostImage.belongsTo(app.model.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
    PostImage.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return PostImage;
};
