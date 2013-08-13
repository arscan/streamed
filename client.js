var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require('fs')
  , redis = require("redis")
  , conf = require('nconf')
  , port = 8000;

conf.argv().file({file: __dirname + "/config.json"}).defaults({
    'geonames_user': 'demo',
    'redis_auth_string': '',
    'redis_port': 6397,
    'redis_host': 'localhost'
});

var redisclient = redis.createClient(conf.get("redis_port"), conf.get("redis_host"));

if(conf.get('redis_auth_string').length > 0){
    console.log("found a redis auth string");
    redisclient.auth(conf.get('redis_auth_string'));
}

if (process.argv.length > 2){
    port = process.argv[2];
}

console.log("listening on port " + port);

server.listen(port);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});
app.get('/wargames', function (req, res) {
  res.sendfile(__dirname + '/public/wargames.html');
});


io.sockets.on('connection', function (socket) {
  console.log("New client");
});


redisclient.on("message", function(channel, message) {
  // You could emit this on a uid rather than 'message' to send
  // different messages to different users
  io.sockets.emit('message', JSON.parse(message));
});

// Watch redis
redisclient.subscribe("github-stream");
