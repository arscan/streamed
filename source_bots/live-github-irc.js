var http = require('https'),
    url = 'https://github.com/timeline.json',
    _ = require('underscore'),
    irc = require('irc');

var server = "irc.robscanlon.com",
    nick = "ghub-bot",
    channel = "#github";

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

var last = [];

var ircclient = new irc.Client(server, nick, {debug: false, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#github"]});

/* listeners */

ircclient.addListener('error', function(message) {
         console.log('irc error: ' +  message);
 });

ircclient.on("error", function(err){
    console.log("irc error: " + err);

});

ircclient.addListener('message', function (from, to, message) {
        console.log(from + ' => ' + to + ': ' + message);
});


/* helper format functions */

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

/* create a message */

var createMessage = function(ev){
    var ret = "";
    var values = [];

    if(ev.repository){
        values.push('' + ev.repository.owner + '/' + ev.repository.name);
    } else if(ev.payload && ev.payload.target){
        values.push(ev.payload.target.login);
    } else {
        values.push('-');
    }

    values.push(shortentype(ev.type));
    values.push(ev.url);


    if(ev.actor_attributes && ev.actor_attributes.login){
        values.push(ev.actor_attributes.login);

    } else {
        values.push("-");

    }
    
    if(ev.actor_attributes && ev.actor_attributes.location){
        values.push(ev.actor_attributes.location);
    } else {
        values.push("-");
    }
    if(ev.repository && ev.repository.language){
        values.push(ev.repository.language);

    } else {
        values.push("-");
    }

    if(ev.actor_attributes && ev.actor_attributes.gravatar_id){
        values.push(ev.actor_attributes.gravatar_id);
    } else {
        values.push("-");
    }

    return formatArray(values);
    
}


/* main run loop */

var run = function(){

    http.get(url,function(res) {
        var data = "";
        res.on('data', function(d){
            data += d;

        });
        res.on('end', function(){

            try {

                var newevents = JSON.parse(data);


                last = _.reject(_.pluck(newevents,"url"), function(url){
                    return _.contains(last,url);
                });

                var count = 0;

                _.each(newevents, function(val){

                      
                    if(_.contains(last,val.url)){
                        count++;
                        setTimeout(function(){
                            ircclient.say(channel,  createMessage(val));
                            console.log(val.url);
                        }, Math.random()*6000);
                    }
                }); 

                console.log(count);

                if(count > 20){
                    setTimeout(run,2000);
                }
            } catch (ex) {

                console.log("Error processing event: " + ex);
            }


        });
    }).on('error', function(e){
        console.log("Error running http request: ", e);
    });

}

setInterval(run,6000);

