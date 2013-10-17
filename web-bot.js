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
var ipserver = "http://loc.robscanlon.com:8081/json/";

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
    var d = req.get("host").replace("www.","");
    console.log("Getting / for " + d);
    if(domainlist[d]){
        return handleRequest(domainlist[d],channellist[domainlist[d]].viz, req, res);
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
    console.log("Num active connections: " + Object.keys(io.connected).length);
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

var locationIsIP4  = function(loc){
    return !!/^\d+\.\d+\.\d+\.\d+$/.exec(loc)
}

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
    var fields = [];
    console.log("----------topic change");
    if(vizparsed){
        viz = vizparsed[1];
        if(viz.split("|").length > 0){
            fields = _.map(viz.split("|")[1].split(","),function(val){return val.trim()});
            viz = viz.split("|")[0];
        }
    }
    if(domainparsed){
        domain = domainparsed[1];
    }
    title = topic.substring(Math.max(topic.lastIndexOf("%"), topic.lastIndexOf("]")) + 1).trim();
    
    if(channellist[channel.substring(1)]){
        console.log("Changed topic of channel " + channel + " viz: " + viz + " domain: " + domain + " title: " + title + " fields: " + fields.length);
        channellist[channel.substring(1)] = {"viz": viz, "domain":domain, "title": title, "fields":fields};
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
        var output = {"raw" : stripColors(message), "data": [], "location": {"name":null, "lat": null, "lng":null}};
        var arr = stripColors(message).split(" * ");
        if(channellist[from.substring(1)] && channellist[from.substring(1)].fields && channellist[from.substring(1)].fields.length){
            output.data = _.map(channellist[from.substring(1)].fields, function(num){return arr[num-1]});
        } else {
            output.data = arr;
        }
        if(channellist[from.substring(1)] && channellist[from.substring(1)].fields && channellist[from.substring(1)].fields.length && channellist[from.substring(1)].fields[0] > 0 && channellist[from.substring(1)].fields[0] <= arr.length && arr[channellist[from.substring(1)].fields[0]-1].length && arr[channellist[from.substring(1)].fields[0]-1] !== "-"){
            var loc = arr[channellist[from.substring(1)].fields[0]-1].trim();
            
            if(locationIsIP4(loc)){
                
                http.get(ipserver + encodeURIComponent(loc), function(res){
                    var buffer = "";
                    res.on("error", function(){
                        console.log("error looking up geonames");
                    });
                    res.on("data", function(data){buffer=buffer+data});
                    res.on("end",function(){
                        try{
                            r = JSON.parse(buffer);
                            if(r.latitude && r.longitude){
                                output.location.lat = r.latitude;
                                output.location.lng = r.longitude;
                                if(r.city.length){
                                    output.location.name=r.city + ", " + r.country_code;
                                } else {
                                    output.location.name=r.country_name;
                                }
                            }
                        } catch (ex){
                            console.log("error looking up ip address " + loc + ": " + ex);

                        }
                        if(channellist[from.substring(1)] && channellist[from.substring(1)].domain.length){

                            io.of('/' + channellist[from.substring(1)].domain).emit('message',output);
                        }
                        io.of('/' + from.substring(1)).emit('message',output);
                        });
                    });


            } else {

                output.location.name = loc;

                http.get(locationserver + encodeURIComponent(loc), function(res){
                    var buffer = "";
                    res.on("error", function(){
                        console.log("error looking up geonames");
                    });
                    res.on("data", function(data){buffer=buffer+data});
                    res.on("end",function(){
                        try{
                            r = JSON.parse(buffer);
                            if(r.lat && r.lng){
                                output.location.lat = r.lat;
                                output.location.lng = r.lng;
                            }
                            if(channellist[from.substring(1)] && channellist[from.substring(1)].domain.length){

                                io.of('/' + channellist[from.substring(1)].domain).emit('message',output);
                            }
                            io.of('/' + from.substring(1)).emit('message',output);
                        } catch (ex) {
                            console.log("Error parsing location")
                        }
                            });
                    });
            }
        } else {

            if(channellist[from.substring(1)] && channellist[from.substring(1)].domain.length){
                io.of('/' + channellist[from.substring(1)].domain).emit('message',output);
            }
            io.of('/' + from.substring(1)).emit('message',output);
        }

    }
});

io.sockets.on('disconnect', function() {
    console.log('Got disconnect!');
    console.log("Num active connections: " + Object.keys(io.connected).length);
});

var stripColors = function(text){

    var ret = text.replace(/\u0003\d{1,2}/g,'');
    ret = ret.replace(/\u0003/g,'');
    ret = ret.replace(/\u000f/g,'');

    return ret;
}

/* web stuff */
webserver.listen(port);


