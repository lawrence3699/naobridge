'use strict';

module.exports = app => {
  const { STRING, INTEGER, BOOLEAN, DATE, ENUM } = app.Sequelize;

  const User = app.model.define('users', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: STRING(50),
      allowNull: false,
    },
    email: {
      type: STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: STRING(255),
      allowNull: false,
    },
    avatar: {
      type: STRING(255),
      defaultValue: null,
    },
    role: {
      type: ENUM('patient', 'family', 'supporter'),
      defaultValue: 'supporter',
    },
    status: {
      type: ENUM('normal', 'muted', 'banned'),
      defaultValue: 'normal',
    },
    muteExpiry: {
      type: DATE,
      defaultValue: null,
    },
    agreedToRules: {
      type: BOOLEAN,
      defaultValue: false,
    },
    openid: {
      type: STRING(128),
      allowNull: true,
      unique: true,
    },
    is_active: {
      type: BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['openid'], unique: true },
    ],
  });

  User.associate = function() {
    User.hasOne(app.model.Userprofile, {
      foreignKey: 'userId',
      as: 'profile',
    });
    User.hasMany(app.model.Post, {
      foreignKey: 'userId',
      as: 'posts',
    });
    User.hasMany(app.model.PostComment, {
      foreignKey: 'userId',
      as: 'comments',
    });
    User.hasMany(app.model.PostLike, {
      foreignKey: 'userId',
      as: 'likes',
    });
    User.hasMany(app.model.PostFeedback, {
      foreignKey: 'userId',
      as: 'feedbacks',
    });
    User.hasMany(app.model.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
    });
    User.hasMany(app.model.Favorite, {
      foreignKey: 'userId',
      as: 'favorites',
    });
    User.belongsToMany(User, {
      through: app.model.UserFollow,
      foreignKey: 'followingId',
      otherKey: 'followerId',
      as: 'followers',
    });
    User.belongsToMany(User, {
      through: app.model.UserFollow,
      foreignKey: 'followerId',
      otherKey: 'followingId',
      as: 'followings',
    });
  };

  return User;
};
