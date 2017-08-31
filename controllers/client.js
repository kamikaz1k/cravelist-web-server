module.exports = function(Client) {
  return {
    // Create endpoint /api/client for POST
    postClients: function(req, res) {
      // Set the client properties that came from the POST data
      var client = {
        name: req.body.name,
        id: req.body.id,
        secret: req.body.secret,
        userId: req.user._id
      }

      // Save the client and check for errors
      Client.create(client).then(function(result) {
        res.json({ message: 'Client added to the locker!', data: result.get({ plain: true }) });
      }).catch((err) => {
        res.send(err);
      });
    },

    // Create endpoint /api/clients for GET
    getClients: function(req, res) {
      // Use the Client model to find all clients
      Client.findAll({ where: { userId: req.user.email } }).then(function(clients) {
        res.json(clients);
      }).catch((err) => {
        res.send(err);
      });
    }
  };
};