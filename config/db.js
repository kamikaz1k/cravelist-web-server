const Sequelize = require('sequelize');

let sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: false
  },
  logging: true
});

module.exports = sequelize;