var http = require('https'),
    url = 'https://github.com/timeline.json',
    _ = require('underscore'),
    irc = require('irc');

var server = "localhost",
    nick = "github2-bot",
    channel = "#github";

var last = [];


var ircclient = new irc.Client(server, nick, {debug: false, showErrors: true, floodProtection: false, floodProtectionDelay: 0, channels: ["#github"]});


// ircclient.addListener('error', function(message) {
//         console.log('irc error: ' +  message);
// });

ircclient.addListener('message', function (from, to, message) {
        console.log(from + ' => ' + to + ': ' + message);
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

var createMessage = function(ev){
    var ret = "";

    if(ev.repository){
        ret += w("gray","[[") + w('orange',ev.repository.owner + "/" + ev.repository.name) + w("gray","]] ");
    } else if(ev.payload && ev.payload.target){
        ret += w("gray","//") + w('orange',ev.payload.target.login) + w("gray","// ");
    }

    ret += w("light_red", shortentype(ev.type));
    ret += w("light_magenta", " * ");

    ret += w("dark_blue",ev.url);

    if(ev.actor_attributes && ev.actor_attributes.login){
        ret += w("light_magenta", " * ") + w("dark_green", ev.actor_attributes.login);

    }
    
    if(ev.actor_attributes && ev.actor_attributes.location){
        ret += w("light_magenta", " * ") + w("yellow", ev.actor_attributes.location);

    }
    if(ev.repository && ev.repository.language){
        ret += w("light_magenta", " * ") + w("light_cyan", ev.repository.language);

    }
    


    return ret;
    



}

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
                    // if(val.type.substring(0,1)== "F"){
                    //    console.log(val);
                    //    process.exit(0);
                    // }

                    // console.log(val);
                      
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

