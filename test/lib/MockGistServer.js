var http = require("http");

var createGistServer = function(port){
    var gistServer = http.createServer(function(request, response) {
        if(request.url === "/arscan/1/raw/index.html"){
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write('Channel with gistid 1');
            response.end();
        } else if(request.url === "/otheruser/2/raw/index.html"){
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write('Channel with gistid 2');
            response.end();
        } else if(request.url === "/arscan/3/raw/index.html"){
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write("" +Math.floor(Math.random() * 100000 ));
            response.end();
        } else if(request.url === "/arscan/1/raw/image.jpg" || request.url === "/otheruser/2/raw/image.jpg"){
            response.writeHead(200, {"Content-Type": "image/jpeg"});
            response.write("xxx");
            response.end();
        }

    }).listen(port);

    return gistServer;
};

module.exports.createGistServer = createGistServer;
