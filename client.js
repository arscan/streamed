var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require('fs')
  , redis = require("redis").createClient();

server.listen(8080);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get("/js/world-50m.json", function (req, res) {
    res.sendfile(__dirname + "/public/js/world-50m.json");

});

io.sockets.on('connection', function (socket) {
  console.log("New client");
});


redis.on("message", function(channel, message) {
  // You could emit this on a uid rather than 'message' to send
  // different messages to different users
  io.sockets.emit('message', JSON.parse(message));
});

// Watch redis
redis.subscribe("github-stream");
