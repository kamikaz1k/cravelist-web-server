const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');

module.exports = function(sequelize) {
	const Token = sequelize.define('token', {
		value: {
			type: Sequelize.STRING,
			required: true
		},
		userId: {
			type: Sequelize.STRING,
			required: true
		},
		clientId: {
			type: Sequelize.STRING,
			required: true
		}
	});

  return Token;

}
