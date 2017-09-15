const Sequelize = require('sequelize');

module.exports = function(sequelize) {
  const Location = sequelize.define('location', {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    address: {
      type: Sequelize.STRING,
      allowNull: false
    },
    placeId: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    googleMapsURL: {
      type: Sequelize.STRING,
      allowNull: true
    },
    coordinates: {
      type: Sequelize.GEOMETRY('POINT'),
      allowNull: true
    }
  });

  return Location;

}