
var _ = require('underscore'),
    util = require('util'), 
    fs = require('fs'), 
    socket = require('socket.io'),
    http = require('http'),
    cache = require('memory-cache'),
    request = require('request');
   // io = require('socket.io').listen(webserver, {'log level': 1})

var createWebServer = function(defaultDomain, port, config){
    var io,
        domains = {}, 
        streams = {};

    var gistserver = "https://gist.github.com/",
        cacheTimeout = 600000;


    if(config && config["gistserver"]){
        gistserver = config["gistserver"];
    }
    if(config && config["cacheTimeout"]){
        cacheTimeout = config["cacheTimeout"];
    }

    // I'm not using express, because it looks like I need a bit more control over how I handle incoming requests,
    // mainly because of custom domains. I may take another look at it in the future, since this is less than pretty

    var server = http.createServer(function(req, res) {
        var gistid = 1,
            gistuser = "arscan",
            gistfile = "index.html",
            stream,
            hostHeader,
            parts;
           
        parts = pathParts(req.url);

        if(req.headers.host){
            hostHeader = req.headers.host.split(":")[0].toLowerCase().replace("www.","");
        }


        if(defaultDomain !== hostHeader && domains[hostHeader]){
            parts.unshift(domains[hostHeader]);

        }

        // ....I hate javascript switch statements 
        // I always forget the break; statement, and then wierd bugs happen

        if(streams[parts[0]] && parts.length === 1 && req.url.charAt(req.url.length-1) !== "/"){
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
            var fileName = __dirname.replace('lib', 'public') +  req.url;
            if(fileName.charAt(fileName.length -1) === "/"){
                fileName = fileName + "index.html";
            }
            
            fs.readFile(fileName,
                        function (err, data) {
                            if (err) {
                                res.writeHead(404);
                                return res.end('No such stream');
                            }

                            res.writeHead(200);
                            res.end(data);
                        });
        }


    });

    // start up socket.io
    io = socket.listen(server, {'log level': 1});

    // start up web server
    server.listen(port);

    /* stream stuff over the test link always */
    io.sockets.on('connection', function (socket) {
        socket.on('subscribe',function(stream){
            socket.join(stream);
            socket.emit('subscribed', stream);
        });
        var address = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address;
    });
    

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
        if(!path.length){
            return [];
        }

        return path.split("/");
    };

    var gistRequest = function(gistuser, gistid, file, cb){
        var path = gistuser + "/" + gistid + "/raw/" + file,
            cachedResponse = cache.get(path);

        if(cachedResponse){
            // not sure if i need to do this, but it seems to make sense to have both do callbacks asynchronously
            process.nextTick(function(){
                cb(cachedResponse);
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
        if(stream.vizdomain){
            domains[stream.vizdomain] = stream.id;
        }
        stream.on('domain', function(data){
            if(domains[data.prevdomain]) {
                delete domains[data.prevdomain];
            }

            domains[data.newdomain] = stream.id;
        });
        
        stream.on('data', function(data){
            // note that they need to subscribe to the proper rooms
            io.sockets.in(stream.id).emit('data', data);
            
        });
        stream.on('close',function(){
            removeStream(stream.id);
        });
    };
    var removeStream = function(id){
        var stream = streams[id];
        if(stream){
            if(stream.vizdomain && domains[stream.id]){
                delete domains[stream.id];
            }
            delete streams[id];
        }
    };
    var getStream = function(id){
        return streams[id];
    };

    var close = function(cb){
        server.close(cb);
    };

    /*
     * Reveal the public functions
     */

    return {
        getStream: getStream,
        addStream: addStream,
        removeStream: removeStream,
        close: close
    };
};


module.exports.createWebServer = createWebServer;
