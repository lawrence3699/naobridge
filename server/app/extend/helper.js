'use strict';

module.exports = {
  /**
   * Create a Sequelize literal for safe decrement (never below zero).
   * Uses GREATEST for MySQL, MAX for SQLite.
   * @param {string} column - column name
   * @param {number} amount - amount to decrement
   * @returns {object} Sequelize.literal expression
   */
  safeDecrement(column, amount = 1) {
    const dialect = this.app.config.sequelize.dialect;
    const fn = dialect === 'sqlite' ? 'MAX' : 'GREATEST';
    return this.app.Sequelize.literal(`${fn}(${column} - ${amount}, 0)`);
  },
};
