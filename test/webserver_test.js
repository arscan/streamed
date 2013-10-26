/*jshint expr: true*/

var WebServer = require('../lib/WebServer.js'),
    DataStream = require('../lib/DataStream.js'),
    GistServer = require('../test/lib/MockGistServer.js'),
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
    var server, 
        gistserver = GistServer.createGistServer(5556);

    beforeEach(function(){
        server = WebServer.createWebServer("localhost", 5555, {"gistserver":"http://localhost:5556/", "cacheTimeout":500});
    });
    afterEach(function(done){
        server.close(done);
    });

    describe("basic", function(){
        it("should get a default request", function(done){
            checkResponse("/", function(data){
                data.should.contain("Welcome");
                done();
            });

        });
    });
    describe("#addStream", function(){
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
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 3));
            checkResponse("/channel/", function(data){
                var response1 = data;
                checkResponse("/channel/arscan/3/", function(data2){
                    data2.should.equal(response1);
                    done();
                });
            });

        });
        it("should clear the cache after a time", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 3));
            checkResponse("/channel/", function(data){
                checkResponse("/channel/arscan/3/", function(data2){
                    data2.should.equal(data);
                    setTimeout(function(){
                        checkResponse("/channel/arscan/3/", function(data3){
                            data3.should.not.equal(data);
                            done();
                        });
                    }, 501); // cache timeout is 500ms in the test server
                });
            });

        });
    });
    describe("#removeStream",function(){
        beforeEach(function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            done();
        });
        it("remove a stream that is not longer there", function(done){
            checkResponse("/channel/", function(body){
                body.should.equal("Channel with gistid 1");
                server.removeStream("channel");
                checkResponse("/channel/", function(body){
                    body.should.equal("No such stream");
                    done();
                });
            }); 
        });
        it("remove a stream if the stream sends an event saying that it should", function(done){
            var stream = server.getStream("channel");
            checkResponse("/channel/", function(body){
                body.should.equal("Channel with gistid 1");
                stream.close();
                checkResponse("/channel/", function(body){
                    body.should.equal("No such stream");
                    done();
                });
            }); 
        });
    });
});







