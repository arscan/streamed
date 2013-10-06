var _ = require('underscore'),
    irc = require('irc'),
    util = require('util'),
    fs = require('fs');

var express = require('express')
  , app = express()
  , http = require('http')
  , webserver = http.createServer(app)
  , io = require('socket.io').listen(webserver, {'log level': 1})
  , port = 8000
  , defaultviz = "wargames";


var server = "irc.robscanlon.com",
    mynick = "web" + Math.floor(Math.random() * 1000),
    masterbot = "prime";

var locationserver = "http://loc.robscanlon.com:8080/";

var channellist = {};
var domainlist = {};

var ircclient = new irc.Client(server, 
        mynick, 
        {debug: true, 
            showErrors: true, 
            floodProtection: false, 
            floodProtectionDelay: 0, 
            channels: ["#controlcenter"]
        });

/* listeners */

ircclient.on('error', function(message) {
     console.log('irc error: ' +  util.inspect(message));
 });


app.enable('trust proxy');

app.use(express.static(__dirname + '/public'));
app.get('/:channel/:viz', function(req, res){ return handleRequest(req.params.channel, req.params.viz.toLowerCase(), req,res); }); 
app.get('/:channel', function(req,res){ return handleRequest(req.params.channel,null, req,res); });
app.get('/', function(req,res){
    console.log("Getting / for " + req.get("host"));
    if(domainlist[req.get("host")]){
        console.log("WHAT TO DO A CUSTOM DOMAIN!!! ");
        return handleRequest(domainlist[req.get("host")],channellist[domainlist[req.get("host")]].viz, req, res);
    } else {
        res.sendfile(__dirname + '/public/index_real.html');
    }
});

var handleRequest = function(channel, viz, req,res){
    console.log("handling request for " + channel + " and viz " + viz);
    if(!channellist[channel]){
        res.send(404,"No such channel");
        return;
    }
    if(!viz){
        viz=channellist[channel].viz;
    }

    fs.exists(__dirname + "/public/viz/" + viz, function(vizexists){
        if(!vizexists){
            res.send(404,"No such visualization");
            return;
        }
        res.sendfile(__dirname + '/public/viz/' + viz + '/index.html');
    });
}
io.sockets.on('connection', function (socket) {
    var address = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address;
    socket.on('disconnect', function () {
        console.log("Dropped connection from " + address);
    });
    console.log("New connection from " + address);
});


var joinChannel = function(channelname){
    if(channellist[channelname.substring(1)]) return;
    channellist[channelname.substring(1)] = {viz: defaultviz, domain: "", title: channelname.substring(1)};
    ircclient.join(channelname);
    console.log("joining " + channelname);
    ircclient.say("#controlcenter", "Joining " + channelname);
}

var partChannel = function(channelname){
    ircclient.part(channelname);
    console.log("parting " + channelname);
    if(domainlist[channellist[channelname.substring(1)]]){
        console.log("deregistering domain too!"); 
        delete domainlist[channellist[channelname.substring(1)]];
    }
    delete channellist[channelname.substring(1)];
    ircclient.say("#controlcenter", "Parting " + channelname);
}


var getLocation = function(loc, cb){
    http.get(locationserver + encodeURIComponent(loc), function(res) {
        var data = "";
        res.on('data', function(d){
            data += d;

        });
        res.on('end', function(){
            
            cb(data);

        });
    }).on('error', function(e){
        console.log("Error running http request: ", e);
    });

};

ircclient.on("join",function(channel, nick){
    if(nick == mynick){ 
        return;
    } else if (nick == "prime") {
        ircclient.send('MODE', channel, '+o', nick);
    }
});
ircclient.on("topic", function(channel, topic){
    var vizparsed = /\[([^\]]*)\]/.exec(topic)
    var domainparsed = /%([^%]*)%/.exec(topic)
    var viz = defaultviz;
    var domain = "";
    var title = topic;
    if(vizparsed){
        viz = vizparsed[1];
    }
    if(domainparsed){
        domain = domainparsed[1];
    }
    title = topic.substring(Math.max(topic.lastIndexOf("%"), topic.lastIndexOf("]")) + 1).trim();
    
    if(channellist[channel.substring(1)]){
        console.log("Changed topic of channel " + channel + " viz: " + viz + " domain: " + domain + " title: " + title);
        channellist[channel.substring(1)] = {"viz": viz, "domain":domain, "title": title};
        if(domain.length){
            domainlist[domain] = channel.substring(1);
        }

    } else {
        console.log("Couldn't find channel " + channel + " when topics came through!");
    }
    

});


ircclient.on('message', function(to,from,message){
    if(from == "#controlcenter" && to == masterbot){
        console.log("to: " + to, " from: " + from, " message: " + message);
        if(message.indexOf("New channel: ") == 0){
            joinChannel(message.substring(13,message.length));
        } else if(message.indexOf("Dead channel: ") == 0){
            partChannel(message.substring(14,message.length));
        }
    } else {
        // io.sockets.emit('message', message);
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
                    if(r.lat && r.lng){
                        arr.push("lat: " + r.lat);
                        arr.push("lng: " + r.lng);
                    }
                    if(channellist[from.substring(1)] && channellist[from.substring(1)].domain.length){
                        io.of('/' + channellist[from.substring(1)].domain).emit('message',arr);
                    }
                    io.of('/' + from.substring(1)).emit('message',arr);
                    });
                });
        } else {

            if(channellist[from.substring(1)] && channellist[from.substring(1)].domain.length){
                io.of('/' + channellist[from.substring(1)].domain).emit('message',arr);
            }
            io.of('/' + from.substring(1)).emit('message',arr);
        }

    }
});

var pollConnected = function(){
    setTimeout(pollConnected, 10000);
    console.log("Num active connections: " + Object.keys(io.connected).length);
}
pollConnected();

io.sockets.on('disconnect', function() {
    console.log('Got disconnect!');
});

var stripColors = function(text){

    var ret = text.replace(/\u0003\d{1,2}/g,'');
    ret = ret.replace(/\u0003/g,'');
    ret = ret.replace(/\u000f/g,'');

    return ret;
}

/* web stuff */
webserver.listen(port);


