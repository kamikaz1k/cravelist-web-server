const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');

module.exports = function(sequelize) {
  const Client = sequelize.define('client', {
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    },
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false
    },
    secret: {
      type: Sequelize.STRING,
      allowNull: false
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });

  return Client;

}