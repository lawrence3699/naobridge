'use strict';

module.exports = app => {
  const { INTEGER } = app.Sequelize;

  const Favorite = app.model.define('favorites', {
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
  }, {
    tableName: 'favorites',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'postId'] },
      { fields: ['userId'] },
    ],
  });

  Favorite.associate = function() {
    Favorite.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Favorite.belongsTo(app.model.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
  };

  return Favorite;
};
