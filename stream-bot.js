var irc = require('irc'),
    _ = require('underscore');

var server = "irc.robscanlon.com",
    nick = "stream-bot",
    channels = [];

var ircclient = new irc.Client(server, nick, {debug: true, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#bots"]});


ircclient.addListener('error', function(err){
    console.log("ERROR: " + err);

});

var last = 

ircclient.addListener('channellist', function (_channels) {
    channels = _channels;
    console.log(channels);

});


setInterval(function(){ircclient.list()}, 10000);
// ircclient.list();
