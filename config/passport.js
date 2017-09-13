// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy
// var FacebookStrategy = require('passport-facebook').Strategy;
// var TwitterStrategy = require('passport-twitter').Strategy;
// var GoogleStrategy = require('passport-google-oauth20').Strategy;

// load up the user model
// load the auth variables
var configAuth = require('./auth');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'a_very_big_sekret';

// expose this function to our app using module.exports
module.exports = function (passport, User) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id).then(function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function (req, email, password, done) {

        // TODO -- check if email is valid
        console.log(email, password);
        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function () {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findById(email).then(function (user) {
            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, { 'error': 'That email is already taken.' });
            } else {

                // if there is no user with that email
                // create the user
                return User.create({
                    email: email,
                    password: User.generateHash(password)
                }).then((newUser) => {
                    done(null, newUser);
                });
            }

        }).catch(function(err){

            // if there are any errors, return the error
            if (err) {
                return done(err);
            }
        });

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function (req, email, password, done) { // callback with email and password from our form
        console.log("### email and pass", email, password);
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ where: { 'email': email } }).then(function (user) {

            // if no user is found, return the message
            if (!user) {
                console.log("No user found");
                return done(null, false, 'No user found.');
            }

            // if the user is found but the password is wrong
            if (!user.validPassword(password)) {
                return done(null, false, 'Oops! Wrong password.');
            }

            console.log("its done then...");
            // all is well, return successful user
            return done(null, user);

        }).catch(function(err) {
            console.log("you gone dun goofed");
            return done(err, false, 'Unknown error...');
        });

    }));

    passport.use('jwt-bearer', new BearerStrategy(
      function(accessToken, done) {
        console.log("### 'jwt-bearer' authentication", accessToken);
        jwt.verify(accessToken, JWT_SECRET, {ignoreExpiration:false}, function (err, decoded) {
          if (err) {
            done(err, false);
          } else {
            console.log("decoded", decoded);
            // done(null, decoded, { scope: '*' });
            User.findOne({ where: { 'email': decoded.data } }).then(function (user) {
                console.log("User obj: ", user.get({ plain: true }));
                // TODO with fake token error
                // if no user is found, return the message
                if (!user) {
                    console.log("No user found");
                    return done(null, false, 'No user found.');
                }

                return done(null, user);

            }).catch(function(err) {
            console.log("you gone dun goofed");
            return done(err, false, 'Unknown error...');
        });
          }
        });
      }
    ));

    passport.use('basic', new BasicStrategy(
      function (email, password, done) {
        console.log("### 'basic' authentication", email, password);
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ where: { 'email': email } }).then(function (user) {
            // if no user is found, return the message
            if (!user) {
                console.log("No user found");
                return done(null, false, 'No user found.');
            }

            // if the user is found but the password is wrong
            if (!user.validPassword(password)) {
                return done(null, false, 'Oops! Wrong password.');
            }

            console.log("User obj: ", user.get({ plain: true }));
            console.log("its done then...");
            // all is well, return successful user

            return done(null, user);

        }).catch(function(err) {
            console.log("you gone dun goofed");
            return done(err, false, 'Unknown error...');
        });
      }
    ));

    /*
    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL,
        profileFields: ['email', 'name']

    },

    // facebook will send back the token and profile
    function (token, refreshToken, profile, done) {

        // asynchronous
        // process.nextTick(function () {

            // find the user in the database based on their facebook id
            User.findOne({ 'facebook.id' : profile.id }, function (err, user) {

                // console.log("USER", JSON.stringify(profile) );

                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err)
                    return done(err);

                // if the user is found, then log them in
                if (user) {
                    return done(null, user); // user found, return that user
                } else {
                    // if there is no user found with that facebook id, create them
                    var newUser            = new User();

                    // set all of the facebook information in our user model
                    newUser.facebook.id    = profile.id; // set the users facebook id
                    newUser.facebook.token = token; // we will save the token that facebook provides to the user
                    newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                    newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

                    // save our user to the database
                    newUser.save(function (err) {
                        if (err)
                            throw err;

                        // if successful, return the new user
                        return done(null, newUser);
                    });
                }

            });
        // });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        // pull in our app id and secret from our auth.js file
        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL

    },

    // twitter will send back the token and profile
    function (token, tokenSecret, profile, done) {

        // asynchronous
        // process.nextTick(function () {

            // find the user in the database based on their facebook id
            User.findOne({ 'twitter.id' : profile.id }, function (err, user) {
                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err)
                    return done(err);

                // if the user is found, then log them in
                if (user) {
                    return done(null, user); // user found, return that user
                } else {
                    // if there is no user found with that facebook id, create them
                    var newUser                  = new User();

                    // set all of the twitter information in our user model
                    newUser.twitter.id           = profile.id; // set the users twitter id
                    newUser.twitter.token        = token; // we will save the token that twitter provides to the user
                    newUser.twitter.displayName  = profile.displayName; // look at the passport user profile to see how names are returned
                    newUser.twitter.username     = profile.username; // twitter has a unique username but no email

                    // save our user to the database
                    newUser.save(function (err) {
                        if (err)
                            throw err;

                        // if successful, return the new user
                        return done(null, newUser);
                    });
                }

            });
        // });

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        // pull in our app id and secret from our auth.js file
        clientID       : configAuth.googleAuth.clientID,
        clientSecret   : configAuth.googleAuth.clientSecret,
        callbackURL    : configAuth.googleAuth.callbackURL

    },

    // google will send back the token and profile
    function (token, refreshToken, profile, done) {
        // find the user in the database based on their facebook id
        User.findOne({ 'google.id' : profile.id }, function (err, user) {

            // if there is an error, stop everything and return that
            // ie an error connecting to the database
            if (err)
                return done(err);

            // if the user is found, then log them in
            if (user) {
                return done(null, user); // user found, return that user
            } else {
                // if there is no user found with that facebook id, create them
                var newUser          = new User();

                // set all of the google information in our user model
                newUser.google.id    = profile.id; // set the users google id
                newUser.google.token = token; // we will save the token that google provides to the user
                newUser.google.name  = profile.displayName; // look at the passport user profile to see how names are returned
                newUser.google.email = profile.emails[0].value; // google can return multiple emails so we'll take the first

                // save our user to the database
                newUser.save(function (err) {
                    if (err)
                        throw err;

                    // if successful, return the new user
                    return done(null, newUser);
                });
            }

        });

    }));*/

};