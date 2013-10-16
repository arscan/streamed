var irc = require('irc');

var server = "irc.robscanlon.com",
    nick = "wiki-bot",
    channel = "#wikipedia";

var separator_color = "gray",
    separator = "*";

var colors = [
    "orange",
    "light_magenta",
    "dark_blue",
    "gray",
    "yellow",
    "light_red",
    "light_magenta",
    "light_cyan"
    ];


var ircclient = new irc.Client(server, nick, {debug: false, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#wikipedia"]});
var ircwiki = new irc.Client("irc.wikimedia.org", "arscan", {channels: ["#en.wikipedia", "#nl.wikipedia", "#de.wikipedia", "#sv.wikipedia", "#fr.wikipedia", "#it.wikipedia", "#ru.wikipedia", "#es.wikipedia", "#es.wikipedia", "#pl.wikipedia", "#war.wikipedia", "#ceb.wikipedia", "#vi.wikipedia", "#ja.wikipedia", "#pt.wikipedia", "#zh.wikipedia"]});

ircclient.addListener('error', function(message) {
         console.log('irc error: ' +  message);
 });
ircwiki.addListener('error', function(message) {
         console.log('irc error: ' +  message);
 });

var w = function(c,t){
    return irc.colors.wrap(c,t);
}

var shortentype = function(t){
    if(t == "PullRequestEvent"){
        return "PR";
    } else {
        return t.substring(0,1);

    }

}
var formatArray = function(arr){
    var i = 0;
    var ret = "";
    for(var j = 0; j< arr.length; j++){
        if(i > colors.length)
            i = 0;

        if(j>0)
            ret += w(separator_color, " " + separator + " ");

        ret += w(colors[i],arr[j]);
        i++;
    }

    return ret;
}

var stripColors = function(text){

    var ret = text.replace(/\u0003\d{1,2}/g,'');
    ret = ret.replace(/\u0003/g,'');

    return ret;

}

var locationIsIP4  = function(loc){
    return !!/^\d+\.\d+\.\d+\.\d+$/.exec(loc)
}

/* create a message */

var createMessage = function(m,c){
    var ret = "";
    var values = [];

    m = stripColors(m);

    values.push(c.substring(1,3));

    var rePattern = new RegExp(/\[\[([^\]]*)\]\]/);
    var ret = rePattern.exec(m);

    if(ret.length > 0){
        values.push(ret[1]);
    } else {
        values.push('-');
    }

    var rePattern = new RegExp(/\[\[[^\]]*\]\]([^h]*)/);
    ret = rePattern.exec(m);

    if(ret && ret.length > 0 && ret[1].replace(/^\s\s*/, '').replace(/\s\s*$/, '').length > 0 && ret[1].length < 5){
        values.push(ret[1].replace(/^\s\s*/, '').replace(/\s\s*$/, ''));
    } else {
        values.push('-');
    }

    rePattern = new RegExp(/(http\:\/\/[^\*]*)/);
    ret = rePattern.exec(m);

    if(ret && ret.length > 0){
        values.push(ret[1]);
    } else {
        values.push('-');
    }

    rePattern = new RegExp(/http\:\/\/[^\s]*\s?\*\s?([^\*]*)*/);
    ret = rePattern.exec(m);
    if(ret && ret.length > 0 && ret[1]){
        var newval = ret[1].replace(/\s\s*$/, '');
        if(locationIsIP4(newval)){
            values.push(newval);
            values.push("-");
        } else {
            values.push("-");
            values.push(newval);
        }
    } else {
        values.push('-');
        values.push('-');
    }

    rePattern = new RegExp(/\(([(\+\-]\d+)\)/);
    ret = rePattern.exec(m);
    if(ret && ret.length > 0){
        values.push(ret[1]);
    } else {
        values.push('-');
    }

    return formatArray(values);
    
}

ircwiki.on('message', function (from, to, message) {
    var m = createMessage(message, to);
    console.log(to);
    console.log(m);
    ircclient.say(channel,  m);
});
// ircwiki.on("channellist_item", function(channel_info){
//     if(/[a-z][a-z]\.wikipedia/.exec(channel_info.name)){
//         console.log("JOINING " + channel_info.name);
//         ircwiki.join(channel_info.name);
//     }
// });
// 
// setTimeout(function(){
// ircwiki.list();
// },15000);


