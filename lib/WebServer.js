
var _ = require('underscore'),
    util = require('util'), 
    http = require('http');
   // io = require('socket.io').listen(webserver, {'log level': 1})



var createWebServer = function(defaultDomain, port){

    var server = http.createServer(function(req, res) {


        res.writeHead(200, {"Content-Type": "test/html"});
        res.write('<html>Welcome</html>');
        res.end();


    }).listen(port);


    var close = function(){
        console.log("closing server");
        server.close();
    };

    return {
        close: close
    };
};


module.exports.createWebServer = createWebServer;
