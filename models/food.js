const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');

module.exports = function(sequelize, User, Location) {
  const Food = sequelize.define('food', {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    // location: {
    //   type: Sequelize.STRING,
    //   allowNull: false
    // },
    eaten: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    notes: {
      type: Sequelize.STRING,
      allowNull: true
    }
  });

  Food.User = Food.belongsTo(User);
  Food.Location = Food.belongsTo(Location);

  return Food;

}