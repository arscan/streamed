
var util = require('util'),
   EventEmitter = require('events').EventEmitter,
   http = require('http');

/* 
* A couple of helper functions  ------------------
* */
var stripColors = function(text){
    if(!text.replace){
        return text;
    }

    var ret = text.replace(/\u0003\d{1,2}/g,'');
    ret = ret.replace(/\u0003/g,'');
    ret = ret.replace(/\u000f/g,'');

    return ret;
};

var locationIsIP4  = function(loc){
    return !!/^\d+\.\d+\.\d+\.\d+$/.exec(loc);
};

var getNamedLocation = function(locationServer, loc, cb) {
    http.get(locationServer + "/" + encodeURIComponent(loc), function(res) {
        var data = "";
        res.on('data', function(d){
            data += d;

        });
        res.on('end', function(){
            var jsonData = {};
            try{
                jsonData = JSON.parse(data);

            } catch(e){
                // console.log(e);

            }
            cb(jsonData); // we had an error, so just callback with blank data
        });
    }).on('error', function(e){
        //console.log("Error running http request: ", e);
    });
};

var getIPLocation = function(ipServer, loc, cb){

    http.get(ipServer + "/json/" + encodeURIComponent(loc), function(res){
        var output = {};
        var buffer = "";
        res.on("error", function(){
            console.log("error looking up geonames");
        });
        res.on("data", function(data){
               buffer+=data;
        });
        res.on("end",function(){
            try{
                var r = JSON.parse(buffer);
                if(r.latitude && r.longitude){
                    output.lat = r.latitude;
                    output.lng = r.longitude;
                    if(r.city.length){
                        output.name=r.city + ", " + r.country_code;
                    } else {
                        output.name=r.country_name;
                    }
                }
            } catch (ex){
                //console.log("error looking up ip address " + loc + ": " + ex);
            }
            cb(output);
        });
    });

};

/* 
* the main data object ---------------------------
* */

function DataStream(id, title, gistuser, gistid, vizdomain, config){
    if (!(this instanceof DataStream)) {
        return new DataStream(id, title, gistuser, gistid, vizdomain, config);
    }
    this.id = id;
    this.title = title;
    this.gistuser = gistuser;
    this.gistid = gistid;
    this.vizdomain = vizdomain;
    this.locationServer = "http://loc.robscanlon.com:8080";
    this.ipServer = "http://loc.robscanlon.com:8081";

    if(this.vizdomain){
        this.vizdomain = this.vizdomain.replace("www.","").toLowerCase();
    }

    if(config && config["locationToLatLngServer"]){
        this.locationServer = config["locationToLatLngServer"];
    }

    if(config && config["IPv4ToLatLngServer"]){
        this.ipServer = config["IPv4ToLatLngServer"];
    }
}

util.inherits(DataStream,EventEmitter);

DataStream.prototype.send = function(message) {
    var self = this;
    var locResultBracket = /\[([^\]]*)\]/.exec(message),
        locResultColor = /\u000308([^\u000f]*)/.exec(message),
        data = {"message": stripColors(message), "location": null};
    var locationMatch = null;

    if(locResultBracket && locResultBracket[1]){
        locationMatch = locResultBracket[1].trim();
    } else if (locResultColor && locResultColor[1]){
        locationMatch = locResultColor[1].trim();
    }

    if(locationMatch === "-"){
        locationMatch = null;
    }
    
    if(locationMatch){
        if(locationIsIP4(locationMatch)){
            getIPLocation(self.ipServer, locationMatch, function(retdata){
                if(retdata.name || (retdata.lat && retdata.lng)){
                    data.location = {};

                }
                if(retdata.name){
                    data.location["name"] = retdata.name;
                }
                if(retdata.lat && retdata.lng){
                    data.location["lat"] = retdata.lat;
                    data.location["lng"] = retdata.lng;
                }
                self.emit('data',data);
            });
        } else {
            data["location"] = {name: locationMatch};
            getNamedLocation(self.locationServer, locationMatch, function(retdata){
                if(retdata.lat && retdata.lng){
                    data.location["lat"] = retdata.lat;
                    data.location["lng"] = retdata.lng;
                }
                self.emit('data',data);
            });
        }

    } else {
        self.emit('data',data);
    }
};

DataStream.prototype.setDomain = function(newdomain){
    var prevdomain = this.vizdomain;
    if(newdomain){
        newdomain = newdomain.toLowerCase().replace("www.", "");
    }
    this.vizdomain = newdomain;
    if(prevdomain !== this.vizdomain){
        this.emit("domain", {prevdomain: prevdomain, newdomain: newdomain});
    }
};
    

DataStream.prototype.setDomain = function(newdomain){
    var prevdomain = this.vizdomain;
    if(newdomain){
        newdomain = newdomain.toLowerCase().replace("www.", "");
    }
    this.vizdomain = newdomain;
    if(prevdomain !== this.vizdomain){
        this.emit("domain", {prevdomain: prevdomain, newdomain: newdomain});
    }
};

DataStream.prototype.close = function(){
    this.emit('close', this.id);
};

module.exports = DataStream;
