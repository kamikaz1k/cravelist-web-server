const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const ejs = require('ejs');
const Sequelize = require('sequelize');
const oauth2orize = require('oauth2orize');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'a_very_big_sekret';
const DB = 'postgres://cravelistserver:123poiasd098@localhost:5432/cravelistdev';
const sequelize = new Sequelize(DB, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: false
  },
  logging: true
});

function Log() {
    console.log("### DEBUG \n\n", arguments, "\n\n### DEBUG");
}

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Use express session support since OAuth2orize requires it
app.use(session({
  secret: 'Super Secret Session Key',
  saveUninitialized: true,
  resave: true
}));

const User = require('./models/user')(sequelize);
const Food = require('./models/food')(sequelize, User);
const Client = require('./models/client')(sequelize);
const Token = require('./models/token')(sequelize);
const Code = require('./models/code')(sequelize);

const passport = require('passport');
require('./config/passport')(passport, User, Client, Token);
app.use(passport.initialize());

var clientController = require('./controllers/client')(Client);
var oauth2Controller = require('./controllers/oauth2')(Client, Code, Token);
const isAuthenticated = passport.authenticate(['local-login','jwt-bearer'], { session : false });
const isClientAuthenticated = passport.authenticate('client-basic', { session : false });
const isBearerAuthenticated = passport.authenticate('bearer', { session: false });

var router = express.Router();

router.route('/clients')
  .post(isAuthenticated, clientController.postClients)
  .get(isAuthenticated, clientController.getClients);

// Create endpoint handlers for oauth2 authorize
router.route('/oauth2/authorize')
  .get(isAuthenticated, oauth2Controller.authorization)
  .post(isAuthenticated, oauth2Controller.decision);

// Create endpoint handlers for oauth2 token
router.route('/oauth2/token')
  .post(isClientAuthenticated, oauth2Controller.token);

app.use('/api', router);

app.post('/api/token', isAuthenticated, (req, res) => {
  // If it has a user -- create and send token
  if (req.user) {
    var token = jwt.sign({ username: req.user.username /*, exp: Date.now() + */ }, JWT_SECRET);
    res.status(200).send({ "access_token": token });
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

function FoodItem(options) {
    return {
        id: options.id,
        name: options.name,
        location: options.location,
        eaten: options.eaten,
        createdAt: options.createdAt,
        modifiedAt: options.modifiedAt 
    };
}

app.set('port',5000);// (process.env.PORT || 3000));

// app.get('/', function(request, response) {
//   // response.send();
//   // response.sendFile(path.join(__dirname + '/app/index.html'));
// });

app.get('/', (req, res) => { res.send("Welcome to CraveList Web Server") });

app.get('/api/foodItems/:foodId', isAuthenticated, function(request, response) {
    let foodId = request.params.foodId;

    if (foodId) {

        let query = db.food.find((v) => v.id == foodId);

        if (query) {
            response.send({ foodItems: query });
        } else {
            response.send("no ID provided");
        }

    } else {
        response.send("no ID provided");
    }
});

app.put('/api/foodItems/:foodId', isAuthenticated, function(request, response) {
    let foodItem = request.body.foodItem, 
        foodId = request.params.foodId;

    if (foodItem) {

        let query = db.food.find((v) => v.id == foodId);

        if (query) {
            Object.assign(query, foodItem);
            response.send({ foodItems: query });
        } else {
            response.send("ID provided unmatched");
        }

    } else {
        response.send("no foodItem data provided");
    }
});

app.post('/api/foodItems', isAuthenticated, function(req, res) {
    console.log("data: ", req.body);
    let foodEntry = FoodItem(req.body.foodItem);
    foodEntry.id = ++db.index;
    db.food.push(foodEntry);
    res.send({ foodItems: foodEntry });
});

app.get('/api/foodItems', isAuthenticated, function(request, response) {
    response.set({
        "Content-Type": "application/json"
    })
    response.send({ foodItems: db.food });
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