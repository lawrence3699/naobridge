'use strict';

module.exports = app => {
  const { INTEGER } = app.Sequelize;

  const UserFollow = app.model.define('user_follows', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    followerId: {
      type: INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    followingId: {
      type: INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'user_follows',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['followerId', 'followingId'] },
    ],
  });

  UserFollow.associate = function() {
    UserFollow.belongsTo(app.model.User, {
      foreignKey: 'followerId',
      as: 'follower',
    });
    UserFollow.belongsTo(app.model.User, {
      foreignKey: 'followingId',
      as: 'following',
    });
  };

  return UserFollow;
};
