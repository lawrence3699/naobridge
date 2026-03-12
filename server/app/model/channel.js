'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Channel = app.model.define('channels', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: STRING(255),
      defaultValue: null,
    },
    avatar: {
      type: STRING(255),
      defaultValue: null,
    },
  }, {
    tableName: 'channels',
    timestamps: true,
  });

  Channel.associate = function() {
    Channel.hasMany(app.model.Post, {
      foreignKey: 'channelId',
      as: 'posts',
    });
  };

  return Channel;
};
