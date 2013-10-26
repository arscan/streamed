var http = require("http");


var createIPServer = function(port){

    var ipserver = http.createServer(function(request, response) {
        if(request.url === "/json/" + encodeURIComponent("204.215.129.226")){
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write('{"ip":"0.0.0.0","country_code":"US","country_name":"United States","region_code":"MA","region_name":"Massachusetts","city":"Waltham","zipcode":"","latitude":42.3765,"longitude":-71.2356,"metro_code":"506","areacode":"781"}');
            response.end();
        } else if (request.url === "/json/" + encodeURIComponent("5.5.5.5")) {
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write('{"ip":"5.5.5.5","country_code":"US","country_name":"United States","region_code":"","region_name":"","city":"","zipcode":"","latitude":38,"longitude":-97,"metro_code":"","areacode":""}');
            response.end();
        } else if (request.url === "/json/" + encodeURIComponent("500.0.0.0")) {
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write('Not Found');
            response.end();
        } else if (request.url === "/json/" + encodeURIComponent("0.0.0.0")) {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write('Error');
            response.end();
        }

    }).listen(port);

    return ipserver;
};


module.exports.createIPServer = createIPServer;
