const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');

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

app.set('port', (process.env.PORT || 5000));

// app.get('/', function(request, response) {
//   // response.send();
//   // response.sendFile(path.join(__dirname + '/app/index.html'));
// });

app.use(bodyParser.json());

app.get('/', (req, res) => { res.send("Welcome to CraveList Web Server") });

app.get('/api/foodItems/:foodId', function(request, response) {
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

app.put('/api/foodItems/:foodId', function(request, response) {
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

app.post('/api/foodItems', function(req, res) {
    console.log("data: ", req.body);
    let foodEntry = FoodItem(req.body.foodItem);
    foodEntry.id = ++db.index;
    db.food.push(foodEntry);
    res.send({ foodItems: foodEntry });
});

app.get('/api/foodItems', function(request, response) {
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
        "Authorization": "key=AAAAaQlRBRw:APA91bGGjDxZgXHbGCfnavayqBpSRgprHXxv2w789QCaG4sxQhRgYpdwSR-InY4CFRW-Zvg-aI3uPOeDmiL4SIWcHx14Xl-h4w94f7h4tQEZpW_3GE-o1dv6ORvL1O7OwJbndj21pXqQ"
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

app.listen(app.get('port'), function() {
  console.log('### Node app is running on port', app.get('port'));
});