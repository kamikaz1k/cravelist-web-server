const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');

module.exports = function(sequelize) {
  const Code = sequelize.define('code', {
    value: {
      type: Sequelize.STRING,
      allowNull: false
    },
    redirectUri: {
      type: Sequelize.STRING,
      allowNull: false
    },
    clientId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });

  return Code;

}