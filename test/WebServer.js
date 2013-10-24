/*jshint expr: true*/

var WebServer = require('../lib/WebServer.js'),
    should = require('should'),
    util = require('util'),
    http = require('http'),
    assert = require('assert');


var checkResponse = function(cb){
    http.get("http://localhost:5555/", function(res){
        var buffer="";
        res.on("data",function(data){
            buffer+=data;
        });
        res.on("end", function(){
            cb(buffer);
        });
    });
};

describe("WebServer", function(){
    var server, gistserver;
    before(function(){
        gistserver = http.createServer(function(request, response) {
            if(request.url === "/arscan/1/index.html"){
                response.writeHead(200, {"Content-Type": "text/html"});
                response.write('Welcome');
                response.end();
            }

        }).listen(5556);
    });

    beforeEach(function(){
        server = WebServer.createWebServer("localhost", 5555, {"gistserver":"http://localhost:5556"});
    });

    describe("Thingy", function(){
        it("should connect to the command center section right away", function(done){
            checkResponse(function(data){
                data.should.contain("Welcome");
                done();
            });

        });
    });
});







