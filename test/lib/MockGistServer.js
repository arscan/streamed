var http = require("http");

var createGistServer = function(port){
    var gistServer = http.createServer(function(request, response) {
        if(request.url === "/arscan/1/raw/index.html"){
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write('Channel with gistid 1');
            response.end();
        } else if(request.url === "/otheruser/2/raw/index.html"){
            response.writeHead(200, {"Content-Type": "text/plain"});
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
        } else if(request.url === "/arscan/5/raw/index.html"){
            response.writeHead(404, {"Content-Type": "text/html"});
            response.write("404 message from github");
            response.end();
        } else if(request.url === "/arscan/4/raw/index.html"){
            console.log(__dirname);
            // var fileName = __dirname.replace('lib', 'public') +  req.url;
            // if(fileName.charAt(fileName.length -1) === "/"){
            //     fileName = fileName + "index.html";
            // }
            // 
            // fs.readFile(fileName,
            //             function (err, data) {
            //                 if (err) {
            //                     res.writeHead(404);
            //                     return res.end('No such stream');
            //                 }

            //                 res.writeHead(200);
            //                 res.end(data);
            //             });
        }

    }).listen(port);

    return gistServer;
};

module.exports.createGistServer = createGistServer;
