var http = require("http");

var createLocationServer = function(port){
    var locserver = http.createServer(function(request, response) {
        if(request.url === "/Boston"){
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write('{"lat":"42.35943","lng":"-71.15977"}');
            response.end();
        } else if (request.url === "/Unknown") {
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write('{}');
            response.end();
        } else if (request.url === "/Malformed") {
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write('Malformed Json Response');
            response.end();
        } else if (request.url === "/Error") {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write('Error');
            response.end();
        }
    }).listen(port);

    return locserver;
};


module.exports.createLocationServer = createLocationServer;
