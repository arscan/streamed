var http = require('https'),
    _ = require('underscore'),
    irc = require('irc'),
    util = require('util');

var server = "irc.robscanlon.com",
    mynick = "prime",
    mainchannel = "#controlcenter";

var baseurl = "http://streams.robscanlon.com";

var channels = [];

var ircclient = new irc.Client(server, mynick, {debug: false, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#controlcenter"]});

/* listeners */

ircclient.addListener('error', function(message) {
         console.log('irc error: ' +  util.inspect(message));
 });


ircclient.on("channellist_item", function(channel_info){
    if(channel_info.name == mainchannel) return;
    if(!_.contains(channels,channel_info.name)){
        channels.push(channel_info.name);
        ircclient.join(channel_info.name);
        console.log("joining " + channel_info.name);
        ircclient.say(mainchannel, "New channel: " + channel_info.name);
    }
});

ircclient.on("names", function(channel,nicks){
    if(channel === "#controlcenter") return;
    console.log("getting names channel: " + channel + " " + util.inspect(nicks));
    if(!_.some(_.keys(nicks), function(val){ return val != "prime" && val.indexOf("web") !== 0; })){
        console.log("None left, leaving!");
        ircclient.say(mainchannel, "Dead channel: " + channel);
        ircclient.part(channel);
        
    }
    

});

ircclient.on("part",function(channel, nick){
    console.log("somebody named " + nick + " is leaving");
    if(nick == mynick) return;
    ircclient.send("NAMES", channel);
    console.log("parted, getting names in a channel to see if I'm alone");
});

ircclient.on("join",function(channel, nick){
    console.log("somebody named " + nick + " is joining, making op");
    if(nick == mynick){
        ircclient.say(channel, "Hi! Anything you say will now be streamed to " + baseurl + "/" + channel.substring(1) + "/");
        ircclient.say(channel, "In the future, I'll be able to help you configure your visualization.  I am still a work in progress ;-)");

        return;
    }
    ircclient.send('MODE', channel, '+o', nick);
    for(var i = 0; i< channels.length; i++){
        ircclient.say(mainchannel, "New channel: " + channels[i]);
    }
});
var listchannels = function(){
    ircclient.list();
}


setInterval(listchannels,3000);
