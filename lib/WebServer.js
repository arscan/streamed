
var _ = require('underscore'),
    util = require('util'), 
    http = require('http'),
    cache = require('memory-cache'),
    request = require('request');
   // io = require('socket.io').listen(webserver, {'log level': 1})




var createWebServer = function(defaultDomain, port, config){
    var domains = {}, 
        streams = {};

    var gistserver = "https://gist.github.com/",
        cacheTimeout = 600000;


    if(config && config["gistserver"]){
        gistserver = config["gistserver"];
    }
    if(config && config["cacheTimeout"]){
        cacheTimeout = config["cacheTimeout"];
    }

    var server = http.createServer(function(req, res) {
        var gistid = 1,
            gistuser = "arscan",
            gistfile = "index.html",
            stream;

        var parts = pathParts(req.url);

        if(parts.length === 0){
            // Root
            res.writeHead(200, {"Content-Type": "test/html"});
            res.write('<html>Welcome</html>');
            res.end();
        } else if(streams[parts[0]] && parts.length === 1 && req.url.charAt(req.url.length-1) !== "/"){
            // just has the streamid and nothing else, should redirect to get the trailing slash so other files work with relative paths
            res.writeHead(302, {'Location': req.url + "/"});
            res.end();
        } else if(streams[parts[0]] && parts.length === 3 && req.url.charAt(req.url.length-1) !== "/"){
            // has the streamid and an alternate gistid and gist user
            // should redirect to get the trailing slash so other files work with relative paths
            res.writeHead(302, {'Location': req.url + "/"});
            res.end();
        } else if (streams[parts[0]] && parts.length === 1){
            // has the streamid, look it up and send the right data from gists
            stream = streams[parts[0]];

            gistRequest(stream.gistuser, stream.gistid, "index.html", function(response){
                res.writeHead(200, response.headers);
                res.write(response.body);
                res.end();
            });
        } else if (streams[parts[0]] && parts.length === 2){
            // has the streamid, and a file to read within it
            stream = streams[parts[0]];

            gistRequest(stream.gistuser, stream.gistid, parts[1], function(response){
                res.writeHead(200, response.headers);
                res.write(response.body);
                res.end();
            });
        } else if(streams[parts[0]] && parts.length === 3){
            // has the streamid and an overriding gist

            gistRequest(parts[1], parts[2], "index.html", function(response){
                res.writeHead(200, response.headers);
                res.write(response.body);
                res.end();
            });
        } else if(streams[parts[0]] && parts.length === 4){
            // has the streamid and an overriding gist and a file

            gistRequest(parts[1], parts[2], parts[3], function(response){
                res.writeHead(200, response.headers);
                res.write(response.body);
                res.end();
            });


        } else {
            res.writeHead(200, {"Content-Type": "test/html"});
            res.write('<html>Welcome</html>');
            res.end();
        }


    }).listen(port);


    /* 
     * Private Functions
     */

    var pathParts = function(path){
        var id;
        if(path.charAt(0) === "/"){
            path = path.substring(1);
        }
        if(path.charAt(path.length-1) === "/"){
            path = path.substring(0, path.length -1);
        }
        return path.split("/");
    };

    var gistRequest = function(gistuser, gistid, file, cb){
        var path = gistuser + "/" + gistid + "/raw/" + file,
            cached = cache.get(path);

        if(cached){
            // not sure if i need to do this, but i like having both do callbacks asynchronously
            process.nextTick(function(){
                cb(cached);
            });

        } else {
            request(gistserver + path, function(error, response, body){
                cache.put(path, response, cacheTimeout);

                /* not sure what to do with errors quite yet */
                if(error){
                    console.log("error with request. should i return a default page or something?");
                    console.log(error);
                    return;
                }

                cb(response);

            });
        }
    };
    
    /* 
     * Public Functions
     */

    var addStream = function(stream){
        streams[stream.id] = stream;
    };

    var close = function(cb){
        server.close(cb);
    };

    /*
     * Reveal the public functions
     */

    return {
        addStream: addStream,
        close: close
    };
};


module.exports.createWebServer = createWebServer;
