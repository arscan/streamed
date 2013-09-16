var _ = require('underscore'),
    irc = require('irc'),
    util = require('util');

var express = require('express')
  , app = express()
  , http = require('http')
  , webserver = http.createServer(app)
  , io = require('socket.io').listen(webserver)
  , port = 8000;

var server = "irc.robscanlon.com",
    mynick = "web" + Math.floor(Math.random() * 1000),
    mainchannel = "#controlcenter",
    masterbot = "prime";

var locationserver = "http://loc.robscanlon.com:8080/";

var channels = [];


var ircclient = new irc.Client(server, mynick, {debug: true, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#controlcenter"]});

/* listeners */

ircclient.addListener('error', function(message) {
         console.log('irc error: ' +  util.inspect(message));
 });


var joinChannel = function(channelname){
    if(_.contains(channels,channelname)) return;

    channels.push(channelname);
    ircclient.join(channelname);
    console.log("joining " + channelname);
    ircclient.say(mainchannel, "Joining " + channelname);
    // TODO: CLEAN THIS UP
    app.get('/' + channelname.substring(1,channelname.length), function (req, res) {
        res.sendfile(__dirname + '/public/index2.html');
        io.sockets.on('connection', function (socket) {
            console.log("New client");
        });
    });
    app.get('/' + channelname.substring(1,channelname.length) + '/:viz', function (req, res) {
        res.sendfile(__dirname + '/public/index2.html');
        io.sockets.on('connection', function (socket) {
            console.log("New client");
        });
    });
}

var partChannel = function(channelname){
    ircclient.part(channelname);
    console.log("parting " + channelname);
    ircclient.say(mainchannel, "Parting " + channelname);
}


function getLocation(loc, cb){
    console.log("Looking up " + loc);
    http.get(locationserver + encodeURIComponent(loc), function(res) {
        var data = "";
        res.on('data', function(d){
            data += d;

        });
        res.on('end', function(){
            console.log("Found " + loc + " at " + data);
            
            cb(data);

        });
    }).on('error', function(e){
        console.log("Error running http request: ", e);
    });

};


ircclient.addListener('message', function(to,from,message){
    if(from == "#controlcenter" && to == masterbot){
        console.log("to: " + to, " from: " + from, " message: " + message);
        if(message.indexOf("New channel: ") == 0){
            joinChannel(message.substring(13,message.length));
        } else if(message.indexOf("Dead channel: ") == 0){
            partChannel(message.substring(14,message.length));
        }
    } else {
        // io.sockets.emit('message', message);
        console.log("sending to just people in " + from.substring(1,from.length));
        var arr = stripColors(message).split(" * ");
        if(from == "#github" && arr.length > 4 && arr[4] !== "-"){

            var loc = arr[4];
            http.get(locationserver + encodeURIComponent(loc), function(res){
                var buffer = "";
                res.on("error", function(){
                    console.log("error looking up geonames");
                });
                res.on("data", function(data){buffer=buffer+data});
                res.on("end",function(){
                    r = JSON.parse(buffer);
                    console.log(r);
                    if(r.lat && r.lng){
                        arr.push("lat: " + r.lat);
                        arr.push("lng: " + r.lng);
                    }
                    io.of('/' + from.substring(1,from.length)).emit('message',arr);
                    });
                });
        } else {
           io.of('/' + from.substring(1,from.length)).emit('message',arr);
        }

    }
});
var stripColors = function(text){

    var ret = text.replace(/\u0003\d{1,2}/g,'');
    ret = ret.replace(/\u0003/g,'');
    ret = ret.replace(/\u000f/g,'');

    return ret;
}

/* web stuff */
webserver.listen(port);

app.use(express.static(__dirname + '/public'));

app.get('/wargames', function (req, res) {
  res.sendfile(__dirname + '/public/wargames.html');
});




