var _ = require('underscore'),
    irc = require('irc'),
    util = require('util');

var express = require('express')
  , app = express()
  , webserver = require('http').createServer(app)
  , io = require('socket.io').listen(webserver)
  , port = 8000;

var server = "irc.robscanlon.com",
    mynick = "web" + Math.floor(Math.random() * 1000),
    mainchannel = "#controlcenter",
    masterbot = "prime";

var channels = [];


var ircclient = new irc.Client(server, mynick, {debug: true, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#controlcenter"]});

/* listeners */

ircclient.addListener('error', function(message) {
         console.log('irc error: ' +  util.inspect(message));
 });

var joinChannel = function(channelname){
    ircclient.join(channelname);
    console.log("joining " + channelname);
    ircclient.say(mainchannel, "Joining " + channelname);
    app.get('/' + channelname.substring(1,channelname.length), function (req, res) {
      res.sendfile(__dirname + '/public/index2.html');
    });
}

var partChannel = function(channelname){
    ircclient.part(channelname);
    console.log("parting " + channelname);
    ircclient.say(mainchannel, "Parting " + channelname);
}

ircclient.on("channellist_item", function(channel_info){
    if(channel_info.name == mainchannel) return;
    if(!_.contains(channels,channel_info.name)){
        channels.push(channel_info.name);
        joinChannel(channel_info.name);
    }
});

ircclient.addListener('message', function(to,from,message){
    if(from == "#controlcenter" && to == masterbot){
        console.log("to: " + to, " from: " + from, " message: " + message);
        if(message.indexOf("New channel: ") == 0){
            joinChannel(message.substring(13,message.length));
        } else if(message.indexOf("Dead channel: ") == 0){
            partChannel(message.substring(14,message.length));
        }
    } else {
        io.sockets.emit('message', message);
    }
});

/* web stuff */
webserver.listen(port);

app.use(express.static(__dirname + '/public'));

app.get('/wargames', function (req, res) {
  res.sendfile(__dirname + '/public/wargames.html');
});


io.sockets.on('connection', function (socket) {
  console.log("New client");
});

setInterval(function(){ircclient.list()}, 30000);

