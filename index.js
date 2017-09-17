const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const ejs = require('ejs');
const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const sequelize = require('./config/db.js');

const TOKEN_JWT_EXPIRY = 60 * 60; // 1 hour
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

function Log() {
    console.log("### DEBUG \n\n", arguments, "\n\n### DEBUG");
}

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const User = require('./models/user')(sequelize);
const Location = require('./models/location')(sequelize);
const Food = require('./models/food')(sequelize, User, Location);

const passport = require('passport');
require('./config/passport')(passport, User);
app.use(passport.initialize());

// const isAuthenticated = passport.authenticate(['local-login', /*'basic',*/'jwt-bearer'], { session : false });
const isAuthenticated =  function(req, res, next) {
  passport.authenticate(['local-login', 'jwt-bearer'], { session : false }, function(err, user, info) {
    if (err) {
      return res.status(401).send({ 'error': err });
    }
    req.user = user;
    next();
  })(req, res, next);
}
const canGetToken = function(req, res, next) {
  passport.authenticate(['local-login', 'refresh-token'], { session : false }, function(err, user, info) {
    if (err) {
      return res.status(401).send({ 'error': err });
    }
    req.user = user;
    next();
  })(req, res, next);
}

app.post('/api/token', canGetToken, (req, res) => {
  // If it has a user -- create and send token
  if (!req.user) {
    return res.status(401).send({ "error": "Unauthorized" });
  }
  var refresh_token;
  var token = jwt.sign({
    data: req.user.get("email")
  }, JWT_SECRET, {
    expiresIn: TOKEN_JWT_EXPIRY
  });

  if (req.body.grant_type) {
    refresh_token = jwt.sign({
      data: req.user.get("email")
    }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    });
  }

  res.status(200).send({
    "access_token": token,
    "expires_in": expiresIn,
    "refresh_token": refresh_token // undefined is deleted attr
  });

});

sequelize
  .sync()
  // .authenticate()
  .then(v => User.findOrCreate({
      where: { email: 'kaiser.dandangi@gmail.com' },
      defaults: { password: User.generateHash('1234567890') }
    })
  )
  .then(() => {
    console.log('Connection has been established successfully.');
    app.listen(app.get('port'), function() {
      console.log('### Node app is running on port', app.get('port'));
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });


app.set('port', process.env.PORT || 5000);

app.get('/', (req, res) => { res.send("Welcome to CraveList Web Server") });

app.get('/api/foodItems/:foodId', isAuthenticated, function(req, res) {
    let foodId = req.params.foodId;

    if (!foodId) {
      return res.send({ "error": "no ID provided" });
    }

    Food.find({ where: { id: foodId }, attributes: { exclude: ['userEmail' ]} }).then(response => {
      console.log(response);
      res.send({ foodItems: response });
    }).catch(err => {
      console.error(err);
      res.status(500).send({ "error": "something went wrong..."});
    });

});

app.put('/api/foodItems/:foodId', isAuthenticated, function(req, res) {
    let foodItem = req.body.foodItem,
        foodId = req.params.foodId;

    if (!foodId) {
      return res.send({ "error": "no ID provided" });
    }

    Food.find({ where: { id: foodId, userEmail: req.user.get("email") }, attributes: { exclude: ['userEmail' ]} }).then(response => {
      console.log("### After Query: ", response);
      // res.send({ foodItems: response });
      return response.update({
        name: foodItem.name,
        location: foodItem.location,
        eaten: foodItem.eaten,
        notes: foodItem.notes,
      });
    }).then(result => {
      console.log("result", result, result.get({ plain: true }));
      result = result.get({ plain: true });
      delete result.userEmail;
      res.send({ foodItems: result });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send({ "error": "something went wrong..."});
    });
});

app.post('/api/foodItems', isAuthenticated, function(req, res) {
    console.log("data: ", req.body);
    console.log("location: ", req.body.foodItem.location);
    let foodEntry = req.body.foodItem,
      coordinates = foodEntry.location.coordinates;

    if (coordinates) {
      foodEntry.location.coordinates = {
        type: 'Point',
        coordinates: coordinates
      }
    }

    let options = {
      name: foodEntry.name,
      location: foodEntry.location,
      eaten: foodEntry.eaten,
      notes: foodEntry.notes,
      userEmail: req.user.get("email")
    };

    let include = {};

    // Search for Location first by placeId
    Location.findOrCreate({
      where: { placeId: foodEntry.location.placeId },
      defaults: foodEntry.location
    }).then(results => {

      console.log("location", results[0]);
      // Had to do this instead of nested insert
      // to accomodate the unique constraint
      return Food.create({
        name: foodEntry.name,
        // location: foodEntry.location,
        locationId: results[0].get("id"),
        eaten: foodEntry.eaten,
        notes: foodEntry.notes,
        userEmail: req.user.get("email")
      });
    }).then(result => {
      return result.reload({
        include: [Location]
      });
    }).then(result => {
      console.log("result", result, result.get({ plain: true }));
      result = result.get({ plain: true });
      delete result.userEmail;
      delete result.locationId;
      res.send({ foodItems: result });
    }).catch(err => {
      console.error(err);
      res.status(500).send({ "error": "something went wrong..." });
    });
});

app.get('/api/foodItems', isAuthenticated, function(req, res) {
    Food.findAll({
      where: { userEmail: req.user.get("email") },
      attributes: { exclude: ['userEmail', 'locationId'] },
      include: [{
        model: Location
      }]
    }).then(response => {
      // console.log(response);
      res.send({ foodItems: response });
    }).catch(err => {
      res.status(500).send({ "error": "something went wrong..."});
    });
});

app.post('/push', function(request, response) {

    let registration = request.body.registration;

    console.log("Subscribed::", request.body, registration);

    const options = {
      hostname: "fcm.googleapis.com",
      path: "/fcm/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "key=${process.env.FCM}"
      }
    };
    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(JSON.stringify({"to": registration}));
    req.end();

    // var myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/json");
    // myHeaders.append("Authorization", "key=AAAAaQlRBRw:APA91bGGjDxZgXHbGCfnavayqBpSRgprHXxv2w789QCaG4sxQhRgYpdwSR-InY4CFRW-Zvg-aI3uPOeDmiL4SIWcHx14Xl-h4w94f7h4tQEZpW_3GE-o1dv6ORvL1O7OwJbndj21pXqQ");
    // fetch("https://fcm.googleapis.com/fcm/send", {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //         "Authorization": "key=AAAAaQlRBRw:APA91bGGjDxZgXHbGCfnavayqBpSRgprHXxv2w789QCaG4sxQhRgYpdwSR-InY4CFRW-Zvg-aI3uPOeDmiL4SIWcHx14Xl-h4w94f7h4tQEZpW_3GE-o1dv6ORvL1O7OwJbndj21pXqQ"
    //     },
    //     body: JSON.stringify({
    //         "to": registration
    //     })
    // });

    response.send("Subscribed::"+registration);
});

app.get('/api/amiloggedin', function (req, res, next) {
    passport.authenticate('basic', function (err, user, info) {
        console.log("### err", err);
        console.log("### user", user);
        console.log("### info", info);

        if (!user) {
            res.send({ 'msg': "no" });
        } else {
            res.send({ 'msg': `yes: ${user.email}` });
        }
    })(req, res, next)
});

// process the signup form
app.post('/api/signup', function(req, res, next) {
  passport.authenticate('local-signup', { session: false }, function(err, user, info) {
    if (err) {
      return res.status(401).send(info || { "error": err });
    }
    res.send({ success: user.email });
  })(req, res, next);
});

/*
function isAuthenticated(req, res, next) {
    Log("### isAuthenticated");
    passport.authenticate('basic', function (err, user, info) {
        if (user) {
            req.user = user;
            return next();
        }

        res.status(401).send({ 'error': "Authentication failed" });
    })(req, res, next);
}*/