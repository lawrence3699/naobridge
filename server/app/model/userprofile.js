'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Userprofile = app.model.define('userprofiles', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    sex: {
      type: INTEGER,
      defaultValue: 0,
      comment: '0: unknown, 1: male, 2: female',
    },
    city: {
      type: STRING(100),
      defaultValue: null,
    },
    province: {
      type: STRING(100),
      defaultValue: null,
    },
    country: {
      type: STRING(100),
      defaultValue: null,
    },
    about_me: {
      type: STRING(500),
      defaultValue: null,
    },
  }, {
    tableName: 'userprofiles',
    timestamps: true,
  });

  Userprofile.associate = function() {
    Userprofile.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return Userprofile;
};
