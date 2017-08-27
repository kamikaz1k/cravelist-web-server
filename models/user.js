const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');

module.exports = function(sequelize) {
  const User = sequelize.define('user', {
    email: {
      type:Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
    password: {
      type:Sequelize.STRING,
      allowNull: false
    }
  });

  User.generateHash = function(password) {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
  };

  // checking if password is valid
  User.prototype.validPassword = function(password) {
      return bcrypt.compareSync(password, this.password);
  };

  User.prototype.getUsername = function() {
      // if (this.local.name) return this.local.name;
      // else if (this.facebook.name) return this.facebook.name;
      // else if (this.twitter.displayName) return this.twitter.displayName;
      // else if (this.google.name) return this.google.name;
      // else return "";
      return "FIX THIS PLS";
  }

  return User;

}