
// expose our config directly to our application using module.exports

module.exports = {

    'facebookAuth' : {
        'clientID'      : process.env.FB_APP_ID,
        'clientSecret'  : process.env.FB_APP_SECRET,
        'callbackURL'   : process.env.FB_CALLBACK_URL
    },

    'twitterAuth' : {
        'consumerKey'       : process.env.TWIT_CONSUMER_KEY,
        'consumerSecret'    : process.env.TWIT_CONSUMER_SECRET,
        'callbackURL'       : process.env.TWIT_CALLBACK_URL
    },

    'googleAuth' : {
        'clientID'      : process.env.GOOG_CLIENT_ID,
        'clientSecret'  : process.env.GOOG_CLIENT_SECRET,
        'callbackURL'   : process.env.GOOG_CALLBACK_URL
    }

};