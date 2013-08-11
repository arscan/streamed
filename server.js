var moment = require("moment"),
    baseurl = "http://data.githubarchive.org/",
    zlib = require("zlib"),
    http = require("http"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    redis = require("redis"),
    events = [],
    conf = require('nconf'),   
    locations = {},
    lookupqueue = [];
  
conf.argv().file({file: __dirname + "/config.json"}).defaults({
    'geonames_user': 'demo',
    'redis_port': 6379,
    'redis_host': 'localhost',
    'redis_auth_string': ''

});
console.log(conf.get("redis_port") + " " + conf.get("redis_host"));

var redisclient = redis.createClient(conf.get("redis_port"), conf.get("redis_host"));

if(fs.existsSync(__dirname + "/locations_cache.json")){
    locations = JSON.parse(fs.readFileSync(__dirname + '/locations_cache.json', 'utf8'));
}

if(conf.get('redis_auth_string').length > 0){
    console.log("found a redis auth string");
    redisclient.auth(conf.get('redis_auth_string'));
}

var bySortedValue = function(obj, callback, context) {
    //http://stackoverflow.com/questions/5199901/how-to-sort-an-associative-array-by-its-values-in-javascript
    var tuples = [];

    for (var key in obj){ tuples.push([key, obj[key]]) };

    tuples.sort(function(b, a) { return a[1].count < b[1].count ? 1 : a[1].count > b[1].count ? -1 : 0 });

    var length = tuples.length;
    while (length--) callback.call(context, tuples[length][0], tuples[length][1]);
}

bySortedValue(locations , function(key, value) {
    if(!value.latlng && !value.fail){
        lookupqueue.push(key);
    } 
});

var load = function(){
    var count = 0;
    console.log("---Loading data");
    http.get({ host: "data.githubarchive.org",
               path: "/" + moment().add("m",moment().zone()-(9*60)).format("YYYY-MM-DD-H") + ".json.gz",
               port: 80 })
       .on('error', function(err){
           console.log('Got some kind of error on the hitting data.githubarchive.org' + err);
           setTimeout(load,60000);
       })
        .on('response', function(response){
            response.pipe(zlib.createGunzip())
               .on('error', function(err){
                   console.log('Got some kind of error unzipping, try again in 1 minutes: ' + err);
                   setTimeout(load,60000);
               })
               .pipe(JSONStream.parse())
               .on('error', function(err){
                   console.log('Got some kind of error on the json stream, try again in 1 minutes: ' + err);
                   setTimeout(load,60000);
               })
               .on('data',function(ev){
                   var index = events.length - 1;
                   var e = {"created_at": ev.created_at, "location": (ev.actor_attributes ? ev.actor_attributes.location : "undefined"), "repo": (ev.repository ? ev.repository.name : "undefined"), "type": ev.type, "url": ev.url}

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
                   setTimeout(load,(61-moment().minutes())*60*1000);
               });
        });
          
}

var undefinedcount = 0;
var reallocationcount = 0;
var latlongcount = 0;

var eventsloop = function(){
    while(events.length && moment(events[0].created_at).add('h',2) < moment()){
        var e = events.shift();
        var location;
        var latlng = undefined;
        // if I just started up, don't flood the channel
        // ignore the ones that aren't recent
        if(moment(e.created_at).add('h',2).add('s',10) > moment()){
            //console.log("getting " + e.location);
            location = "undefined";
            if(e.location){
                location = "" + e.location;
                latlng = lookup(location);
                if(latlng){
                    latlongcount++;
                    e.latlng=latlng;
                }

            } 
            
            // just a regular hit

            if(location == "undefined"){
                undefinedcount++;
            } else {
                reallocationcount++;
            }
            console.log("Left: " + events.length + " Type: " + e.type + "\t Loc: " + location + (latlng ? " Latlng: " + latlng.lat + " " + latlng.lng: ""));
            redisclient.publish("github-stream", JSON.stringify(e));

        }
    }
}

var lookup = function(place){
    if("" + place == "undefined")
        return undefined;

    if(!locations[place]){
        locations[place] = {count: 1};
        lookupqueue.push(place);
    } else {
        locations[place].count++;
    }
    return locations[place]["latlng"];
}
var checklocation = function(loc, cb){

    http.get("http://api.geonames.org/searchJSON?maxRows=1&username=" + conf.get("geonames_user") + "&q=" + encodeURIComponent(loc), function(res){
        var buffer = "";
        res.on("error", function(){
            console.log("error looking up geonames");
        });
        res.on("data", function(data){buffer=buffer+data});
        res.on("end",function(){
            r = JSON.parse(buffer);
            if(r.geonames && r.geonames[0] && r.geonames[0].lng && r.geonames[0].lat){
                console.log("" + r.geonames[0].lat + " " +r.geonames[0].lng);
                cb({"lat":r.geonames[0].lat, "lng": r.geonames[0].lng});
            } else {
                cb();
            }
            });
        });
}

var locationloop = function(){
    if(lookupqueue.length > 0){
        l = lookupqueue.shift();
        console.log("~~~~~~ GETTING "  + l);
        checklocation(l, function(latlng){
            if(latlng){
                locations[l].latlng = latlng;
            } else {
                locations[l].fail=1;
            }
        });
    }
}
var statsloop = function(){
    var hitpercent = (100.0 * latlongcount) / (reallocationcount);
        definedpercent = (100.0 * reallocationcount) / (undefinedcount + reallocationcount);
    console.log("  %%%%%% Defined : " + definedpercent.toFixed(2) + "% Lookup Hit: " + hitpercent.toFixed(2) + "% Lookup Queue: " + lookupqueue.length);
}

var savelocationsloop = function(){
    fs.writeFile(__dirname + '/locations_cache.json', JSON.stringify(locations), function(){
        console.log("_____saved locations");
        
        
    });
}

load();
setInterval(eventsloop,1000);
setInterval(locationloop,10000);
setInterval(savelocationsloop,600000);
setInterval(statsloop,60020);
