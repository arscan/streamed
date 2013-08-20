var irc = require('irc');

var server = "localhost",
    nick = "wiki-bot",
    channel = "#wikipedia";

var last = [];


var ircclient = new irc.Client(server, nick, {debug: false, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#wikipedia"]});


// ircclient.addListener('error', function(message) {
//         console.log('irc error: ' +  message);
// });

var ircwiki = new irc.Client("irc.wikimedia.org", "arscan", {channels: ["#en.wikipedia"]});

ircwiki.addListener('message', function (from, to, message) {
    console.log(message);
    ircclient.say(channel,  message);
});

