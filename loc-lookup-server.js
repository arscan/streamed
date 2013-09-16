var moment = require("moment"),
    http = require("http"),
    fs = require("fs"),
    _ = require("underscore"),
    events = [],
    conf = require('nconf'),   
    locations = {},
    lookupqueue = [],
    express = require('express'),
    app = express(),
    webserver = require('http').createServer(app);
  
conf.argv().file({file: __dirname + "/config.json"}).defaults({
    'geonames_user': 'demo',
    'redis_port': 6379,
    'redis_host': 'localhost',
    'redis_auth_string': ''

});
if(fs.existsSync(__dirname + "/locations_cache.json")){
    locations = JSON.parse(fs.readFileSync(__dirname + '/locations_cache.json', 'utf8'));
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


var undefinedcount = 0;
var reallocationcount = 0;
var latlongcount = 0;


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
var savelocationsloop = function(){
    fs.writeFile(__dirname + '/locations_cache.json', JSON.stringify(locations), function(){
        console.log("_____saved locations");
        
        
    });
}

app.get("/:location", function(req,res){
    var lookedup = lookup(req.params.location); 
    console.log("hit location: " + req.params.location);
    if(!lookedup){
        res.send("{}");
    } else {
        res.send(JSON.stringify(lookedup));
    }

});

setInterval(locationloop,10000);
setInterval(savelocationsloop,600000);
app.listen(8080);
console.log("started");
