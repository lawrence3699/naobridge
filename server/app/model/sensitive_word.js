'use strict';

module.exports = app => {
  const { STRING, INTEGER, ENUM } = app.Sequelize;

  const SensitiveWord = app.model.define('sensitive_words', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    word: {
      type: STRING(100),
      allowNull: false,
      unique: true,
    },
    category: {
      type: ENUM('ad', 'fraud', 'discrimination', 'medical-fraud', 'violence'),
      allowNull: false,
    },
  }, {
    tableName: 'sensitive_words',
    timestamps: true,
    indexes: [
      { fields: ['category'] },
    ],
  });

  return SensitiveWord;
};
