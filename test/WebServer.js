/*jshint expr: true*/

var WebServer = require('../lib/WebServer.js'),
DataStream = require('../lib/DataStream.js'),
should = require('should'),
util = require('util'),
http = require('http'),
assert = require('assert');


var checkResponse = function(path, cb){
    http.get("http://localhost:5555" + path, function(res){
        var buffer="";
        res.on("data",function(data){
            buffer+=data;
        });
        res.on("end", function(){
            cb(buffer, res);
        });
    });
};

describe("WebServer", function(){
    var server, gistserver;
    before(function(){
        /* this is the dummy gist server for testing purposes */
        gistserver = http.createServer(function(request, response) {
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
                response.write(Math.floor(Math.random() * 100000 ));
                response.end();
            } else if(request.url === "/arscan/1/raw/image.jpg" || request.url === "/otheruser/2/raw/image.jpg"){
                response.writeHead(200, {"Content-Type": "image/jpeg"});
                response.write("xxx");
                response.end();
            }

        }).listen(5556);
    });

    beforeEach(function(){
        server = WebServer.createWebServer("localhost", 5555, {"gistserver":"http://localhost:5556/"});
    });
    afterEach(function(done){
        server.close(done);
    });

    describe("functions", function(){
        it("should get a default request", function(done){
            checkResponse("/", function(data){
                data.should.contain("Welcome");
                done();
            });

        });
        it("should get a channel with a viz with a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/", function(data){
                data.should.equal("Channel with gistid 1");
                done();
            }); 

        });
        it("should get other resources for a channel from the gist server with default viz", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/image.jpg", function(data,res){
                res.headers["content-type"].should.equal("image/jpeg");
                done();
            }); 

        });
        it("should redirect for just a viz without a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel", function(data, res){
                res.statusCode.should.equal(302);
                res.headers["location"].should.equal("/channel/");

                done();
            }); 

        });
        it("should get a channel and override the viz with a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2/", function(data){
                data.should.equal("Channel with gistid 2");
                done();
            }); 

        });
        it("should get other resources for a channel from the gist server with overriding gists", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2/image.jpg", function(data,res){
                res.headers["content-type"].should.equal("image/jpeg");
                done();
            }); 

        });
        it("should redirect to add trailing slash with overriding viz if no trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2", function(data, res){
                res.statusCode.should.equal(302);
                res.headers["location"].should.equal("/channel/otheruser/2/");

                done();
            }); 

        });
        it("should cache responses", function(done){
            checkResponse("/arscan/2/index.html", function(data){
                var response1 = data;
                checkResponse("/arscan/2/index.html", function(data){
                    data.should.equal(response1);
                    done();
                });
            });

        });
    });
});







