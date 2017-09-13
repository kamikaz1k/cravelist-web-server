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

function Log() {
    console.log("### DEBUG \n\n", arguments, "\n\n### DEBUG");
}

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const User = require('./models/user')(sequelize);
const Food = require('./models/food')(sequelize, User);

const passport = require('passport');
require('./config/passport')(passport, User);
app.use(passport.initialize());

const isAuthenticated = passport.authenticate(['local-login', 'basic','jwt-bearer'], { session : false });

var router = express.Router();

app.post('/api/token', isAuthenticated, (req, res) => {
  // If it has a user -- create and send token
  if (req.user) {
    var expiresIn = 60 * 60; // 1 hour
    var token = jwt.sign({ data: req.user.get("email") }, JWT_SECRET, { expiresIn: expiresIn });
    res.status(200).send({ "access_token": token, "expires_in": expiresIn });
  } else {
    res.status(401).send({ "error": "Unauthorized" });
  }
});

sequelize
  .sync()
  // .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    // console.log(User, User.findById("1"));
    app.listen(app.get('port'), function() {
      console.log('### Node app is running on port', app.get('port'));
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const db = {
    index: 3,
    food: [
        {
            id: "1",
                name: "There's a name",
                location: "And its location",
                eaten: false,
                createdAt: new Date(),
                modifiedAt: new Date()
        },
        {
            id: "2",
                name: "TBiryani",
                location: "And its location",
                eaten: false,
                createdAt: new Date(),
                modifiedAt: new Date()
        },
        {
            id: "3",
                name: "Thai Rice",
                location: "And its location",
                eaten: false,
                createdAt: new Date(),
                modifiedAt: new Date()
        }
    ]
};

app.set('port',5000);// (process.env.PORT || 3000));

// app.get('/', function(request, response) {
//   // response.send();
//   // response.sendFile(path.join(__dirname + '/app/index.html'));
// });

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
    let foodEntry = req.body.foodItem;
    Food.create({
      name: foodEntry.name,
      location: foodEntry.location,
      eaten: foodEntry.eaten,
      notes: foodEntry.notes,
      userEmail: req.user.get("email")
    }).then(result => {
      console.log("result", result, result.get({ plain: true }));
      result = result.get({ plain: true });
      delete result.userEmail;
      res.send({ foodItems: result });
    }).catch(err => {
      console.error(err);
      res.status(500).send({ "error": "something went wrong..." });
    });
});

app.get('/api/foodItems', isAuthenticated, function(req, res) {
    Food.findAll({
      where: { userEmail: req.user.get("email") },
      attributes: { exclude: ['userEmail' ] }
    }).then(response => {
      console.log(response);
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
            res.send({ 'error': "no" });
        } else {
            res.send({ 'success': user.email });
        }
    })(req, res, next)
});

// app.post('/api/login', function (req, res, next) {
//     passport.authenticate('basic', function (err, user, info) {
//         // console.log("### req", req);
//         // console.log("### res", res);
//         console.log("### err", err);
//         console.log("### user", user);
//         console.log("### info", info);

//         if (!user) {
//             res.send({ 'error': info });
//         } else {
//             res.send({ 'user': user });
//         }
//     })(req, res, next)
// });

// process the signup form
app.post('/api/signup', passport.authenticate('local-signup'), function (req, res) {
    console.log(req,res);
});

app.post('/api/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/login');
}

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