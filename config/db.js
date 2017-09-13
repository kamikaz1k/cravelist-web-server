const Sequelize = require('sequelize');

let sequelize = new Sequelize('postgres://cravelistserver:123poiasd098@localhost:5432/cravelistdev', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: false
  },
  logging: true
});

module.exports = sequelize;