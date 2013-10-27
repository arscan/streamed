/*jshint expr: true*/

var WebServer = require('../lib/WebServer.js'),
    DataStream = require('../lib/DataStream.js'),
    GistServer = require('../test/lib/MockGistServer.js'),
    io = require('socket.io-client'),
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
    describe("#getStream",function(){
        it("should get a stream by id", function(){
            server.addStream(new DataStream("xyz", "This is the title of the stream", "arscan", 1));
            server.getStream("xyz").id.should.equal("xyz");
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
    describe("socket.io functions", function(){
        var socket1, socket2, socketWaiting;

        var createSocket = function(channel, done){
            var socket = io.connect('http://localhost:5555', {
                'reconnection delay' : 0, 
                'reopen delay' : 0, 
                'force new connection' : true
            });
            socket.on('connect', function() {
                socket.emit('subscribe', channel);
            });
            socket.on('subscribed', function(channelsub) {
                channel.should.equal(channelsub);
                socketWaiting--;
                if(socketWaiting === 0){
                    done();
                }
            });
            socket.on('disconnect', function() {
                // console.log('disconnected...');
            });
            return socket;
        };
        beforeEach(function(done) {
            socketWaiting = 2;
            socket1 = createSocket("channel1", done);
            socket2 = createSocket("channel2", done);
        });
        afterEach(function(done) {
            
            // Cleanup
            if(socket1.socket.connected) {
                socket1.disconnect();
            }
            if(socket2.socket.connected) {
                socket2.disconnect();
            }
            done();
        });

        it("should get stream data for the stream that it wants if on fist channel", function(done){
            var stream = new DataStream("channel1", "This is the title of the stream", "arscan", 4);

            server.addStream(stream);
            var rand = Math.floor(Math.random()*10000);
            socket1.on('data', function(data){
                data.message.should.equal(rand);
                server.removeStream(stream.id);
                done();
            });
            stream.send(rand);

        });
        it("should get stream data for the stream that it wants if on second channel", function(done){
            var stream = new DataStream("channel2", "This is the title of the stream", "arscan", 4);

            server.addStream(stream);
            var rand = Math.floor(Math.random()*10000);
            socket2.on('data', function(data){
                data.message.should.equal(rand);
                server.removeStream(stream.id);
                done();
            });
            stream.send(rand);

        });
        it("shouldn't get stream data that it shouldn't get", function(done){
            var stream = new DataStream("channel1", "This is the title of the stream", "arscan", 4);

            server.addStream(stream);
            var rand = Math.floor(Math.random()*10000);
            socket2.on('data', function(data){
                throw "Client on 2 got something meant for 1";
            });
            setTimeout(done, 1000); // give it a second to pick up on the bad message
            stream.send(rand);
        });

    });
});

