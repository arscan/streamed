var http = require('https'),
    url = 'https://github.com/timeline.json',
    _ = require('underscore'),
    irc = require('irc');

var server = "localhost",
    nick = "github-bot",
    channel = "#github";

var last = [];


var ircclient = new irc.Client(server, nick, {channels: ["#github"]});


ircclient.addListener('error', function(message) {
        console.log('irc error: ', message);
});

var run = function(){

    http.get(url,function(res) {
        var data = "";
        res.on('data', function(d){
            data += d;

        });
        res.on('end', function(){

            var newevents = JSON.parse(data);


            last = _.reject(_.pluck(newevents,"url"), function(url){
                return _.contains(last,url);
            });

            var count = 0;

            _.each(newevents, function(val){
                if(_.contains(last,val.url)){
                    count++;
                    console.log(val.url);
                    ircclient.say(channel, JSON.stringify({"url": val.url}));
                }
            }); 

            console.log(count);

            if(count > 20){
                setTimeout(run,2000);
            }


        });
    }).on('error', function(e){
        console.log("Error running http request: ", e);
    });

}


setInterval(run,6000);

