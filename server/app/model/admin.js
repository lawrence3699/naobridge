'use strict';

module.exports = app => {
  const { INTEGER, ENUM } = app.Sequelize;

  const Admin = app.model.define('admins', {
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
    level: {
      type: ENUM('super', 'normal'),
      defaultValue: 'normal',
    },
  }, {
    tableName: 'admins',
    timestamps: true,
  });

  Admin.associate = function() {
    Admin.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return Admin;
};
