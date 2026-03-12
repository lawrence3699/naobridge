'use strict';

module.exports = app => {
  const { STRING, INTEGER, BOOLEAN, ENUM } = app.Sequelize;

  const Notification = app.model.define('notifications', {
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
    type: {
      type: ENUM('comment', 'reply', 'system', 'report-result'),
      allowNull: false,
    },
    title: {
      type: STRING(100),
      allowNull: false,
    },
    content: {
      type: STRING(500),
      allowNull: false,
    },
    relatedId: {
      type: INTEGER,
      defaultValue: null,
    },
    isRead: {
      type: BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['userId', 'isRead'] },
    ],
  });

  Notification.associate = function() {
    Notification.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return Notification;
};
