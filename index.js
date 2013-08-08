var moment = require("moment"),
    baseurl = "http://data.githubarchive.org/",
    zlib = require("zlib"),
    http = require("http"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    events = [],
    locations = {},
    lookupqueue = [];

var load = function(){
    var count = 0;
    console.log("---Loading data");

    http.get({ host: "data.githubarchive.org",
               path: "/" + moment().add("m",moment().zone()-(9*60)).format("YYYY-MM-DD-HH") + ".json.gz",
               port: 80 })
        .on('response', function(response){
            response.pipe(zlib.createGunzip())
               .pipe(JSONStream.parse())
               .on('data',function(e){
                   var index = events.length - 1;
                   count+=1;
                   events.push(e);

                   // make sure that they go in the right order
                   // sometimes this messes up a little bit because of the asyn nature of this
                   // but an error here and there isn't a big deal to us
                   while(index > 0 && moment(events[index-1].created_at) > moment(e.created_at)){
                       events[index] = events[index-1];
                       events[index-1] = e;
                       index--;
                   }
                   
               }).on('end', function(){
                   console.log("----Added " + count + " more events");
               })
        });
          
    setTimeout(load,(61-moment().minutes())*60*1000);
}

var eventsloop = function(){
    while(events.length && moment(events[0].created_at).add('h',2) < moment()){
        var e = events.shift();
        var location;
        // if I just started up, don't flood the channel
        // ignore the ones that aren't recent
        if(moment(e.created_at).add('h',2).add('s',10) > moment()){
            location = "undefined";
            if(e.actor_attributes){
                location = e.actor_attributes.location;
                latlng = lookup(location);
                if(latlng){
                    location += " " + latlng.lat + " " + latlng.lng;
                }

            }
            console.log("Left: " + events.length + " Loc: " + location);

        }
    }
}

var lookup = function(place){
    if("" + place == "undefined")
        return undefined;

    if(!locations[place]){
        locations[place] = {count: 0};
        lookupqueue.push(place);
    } else {
        locations[place].count++;
    }
    return locations[place]["latlng"];
}

var locationloop = function(){
    l = lookupqueue.shift();
    console.log("~~~~~~ GETTING "  + l);
    var buffer = "";
    http.get("http://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(l) + "&sensor=false", function(res){
        var buffer = "";
        res.on("data", function(data){buffer=buffer+data});
        res.on("end",function(){
            r = JSON.parse(buffer);
            if(r.results && r.results[0] && r.results[0].geometry && r.results[0].geometry.location){
                console.log("" + r.results[0].geometry.location.lat + " " +r.results[0].geometry.location.lng); 
                locations[l].latlng = r.results[0].geometry.location;
            }
            });
        });

}

load();
setInterval(eventsloop,1000);
setInterval(locationloop,10000);
