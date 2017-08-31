var oauth2orize = require('oauth2orize');

var server = oauth2orize.createServer();

module.exports = function (Client, Code, Token) {

	// Register serialialization function
	server.serializeClient(function(client, callback) {
		console.log("### Serialize id: ", client.id, client);
	  return callback(null, client.id);
	});

	// Register deserialization function
	server.deserializeClient(function(id, callback) {
		console.log("### Deserialize id: ", id);
	  Client.findById(id).then(function (client) {
	  	console.log("### Client: ", client.get({ plain: true }), " for id ", id);
	    return callback(null, client);
	  }).catch(callback);
	});

	// Register authorization code grant type
	server.grant(oauth2orize.grant.code(function(client, redirectUri, user, ares, callback) {
	  
		console.log("### oauth2orize.grant - create code", client.dataValues, redirectUri, user, ares);
		console.log('client ', client.get({ plain: true }));
		console.log('redirectUri ', redirectUri);
		console.log('user ', user);
		console.log('ares ', ares);

	  // Create a new authorization code
	  var code = {
	    value: uid(16),
	    clientId: client.id,
	    redirectUri: redirectUri,
	    userId: user.email
	  };

	  console.log("### Code: ", code);

	  // Save the auth code and check for errors
	  Code.create(code).then(function(result) {
	  	console.log("### Code created: ", result.get({ plain: true }));
	    callback(null, code.value);
	  }).catch(callback);

	}));

	// Exchange authorization codes for access tokens
	server.exchange(oauth2orize.exchange.code(function(client, code, redirectUri, callback) {
		
		console.log("### oauth2orize.exchange - find code", client.dataValues, code, redirectUri);

	  Code.findOne({ where: { value: code } }).then(function (authCode) {
	  	console.log("### code found ", authCode.get({ plain: true }), client.id);
	    if (authCode === undefined) { return callback(null, false); }
	    if (client.id !== authCode.clientId) { return callback(null, false); }
	    if (redirectUri !== authCode.redirectUri) { return callback(null, false); }

	    // Delete auth code now that it has been used
	    authCode.destroy().then(function (result) {
	      // Create a new access token
	      var token = {
	        value: uid(128),
	        clientId: authCode.clientId,
	        userId: authCode.userId
	      };

	      // Save the access token and check for errors
	      Token.create(token).then(function (result) {
	      	console.log("### Token created: ", result.get({ plain: true }));
	        callback(null, result);
	      }).catch(callback);
	    }).catch(callback);
	  }).catch(callback);
	}));

	return {
		
		// User authorization endpoint
		authorization: [
		  server.authorization(function(clientId, redirectUri, callback) {

		  	console.log("### server.authorization - ", clientId, redirectUri);

		    Client.findOne({ id: clientId }).then(function (client) {
		      return callback(null, client, redirectUri);
		    }).catch(callback);
		  }),
		  function(req, res){
		  	console.log("### sending response...", { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
		    res.render(
		    	`dialog.ejs`, { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
		  }
		],

		// User decision endpoint
		decision: [
		  server.decision()
		],

		// Application client token exchange endpoint
		token: [
		  server.token(),
		  server.errorHandler()
		]
	};
}

function uid (len) {
  var buf = []
    , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

