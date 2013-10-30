/*jshint expr: true*/

var WebServer = require('../lib/WebServer.js'),
    DataStream = require('../lib/DataStream.js'),
    GistServer = require('../test/lib/MockGistServer.js'),
    io = require('socket.io-client'),
    should = require('should'),
    util = require('util'),
    request = require('request'),
    assert = require('assert');

var checkResponse = function(path, host, cb){
    var headers = {};

    if(host){
        headers["host"] = host;
    }
    request.get({url: "http://localhost:5555" + path, followRedirect: false, headers: headers}, function(error, response, body){
        cb(body, response);
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
            checkResponse("/", null, function(data){
                data.should.contain("Welcome");
                done();
            });

        });
    });
    describe("#addStream", function(){
        it("should get a channel with a viz with a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/", null, function(data, res){
                data.should.equal("Channel with gistid 1");
                res.headers['content-type'].should.equal("text/html");
                done();
            }); 

        });
        it("should get other resources for a channel from the gist server with default viz", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/image.jpg", null, function(data,res){
                res.headers["content-type"].should.equal("image/jpeg");
                done();
            }); 

        });
        it("should not pass along the 404 page from github", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 5));
            checkResponse("/channel/", null, function(data,res){
                res.statusCode.should.equal(404);
                data.should.not.contain("404 message from github");
                done();
            }); 

        });
        it("should redirect for just a viz without a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel",null, function(data, res){
                res.statusCode.should.equal(302);
                res.headers["location"].should.equal("/channel/");

                done();
            }); 

        });
        it("should get a channel and override the viz with a trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2/", null, function(data){
                data.should.equal("Channel with gistid 2");
                done();
            }); 

        });
        it("should get other resources for a channel from the gist server with overriding gists", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2/image.jpg", null, function(data,res){
                res.headers["content-type"].should.equal("image/jpeg");
                done();
            }); 

        });
        it("should redirect to add trailing slash with overriding viz if no trailing slash", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));
            checkResponse("/channel/otheruser/2", null, function(data, res){
                res.statusCode.should.equal(302);
                res.headers["location"].should.equal("/channel/otheruser/2/");

                done();
            }); 

        });
        it("should cache responses", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 3));
            checkResponse("/channel/", null, function(data){
                var response1 = data;
                checkResponse("/channel/arscan/3/", null, function(data2){
                    data2.should.equal(response1);
                    done();
                });
            });

        });
        it("should clear the cache after a time", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 3));
            checkResponse("/channel/", null, function(data){
                checkResponse("/channel/arscan/3/", null, function(data2){
                    data2.should.equal(data);
                    setTimeout(function(){
                        checkResponse("/channel/arscan/3/", null, function(data3){
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
        it("remove a stream that is no longer there", function(done){
            checkResponse("/channel/", null, function(body){
                body.should.equal("Channel with gistid 1");
                server.removeStream("channel");
                checkResponse("/channel/", null, function(body){
                    body.should.equal("No such stream");
                    done();
                });
            }); 
        });
        it("remove a stream if the stream sends an event saying that it should", function(done){
            var stream = server.getStream("channel");
            checkResponse("/channel/", null, function(body){
                body.should.equal("Channel with gistid 1");
                stream.close();
                checkResponse("/channel/", null, function(body){
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
    describe("alternate domain functions", function(){
        it("should see that a domain is used and bypass first level directory", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1, "robscanlon.com"));

            checkResponse("/", "robscanlon.com", function(data){
                data.should.contain("Channel with gistid 1");
                done();
            });
        });

        it("should drop the www from the request", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1, "robscanlon.com"));

            checkResponse("/", "www.robscanlon.com", function(data){
                data.should.contain("Channel with gistid 1");
                done();
            });
        });
        it("should drop the www from the configuration", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1, "www.robscanlon.com"));

            checkResponse("/", "robscanlon.com", function(data){
                data.should.contain("Channel with gistid 1");
                done();
            });
        });
        it("should get domains with different cases", function(done){
            server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1, "ROBSCANLON.COM"));

            checkResponse("/", "robscanlon.com", function(data){
                data.should.contain("Channel with gistid 1");
                done();
            });
        });

        it("shouldn't get a domain that was on a stream that got closed", function(done){
            var stream = new DataStream("channel", "This is the title of the stream", "arscan", 1, "ROBSCANLON.COM");

            server.addStream(stream);
            stream.close();

            checkResponse("/", "robscanlon.com", function(data){
                data.should.not.contain("Channel with gistid 1");
                done();
            });
        });
        it("should get a domain that was added after the stream was created", function(done){
            var stream = new DataStream("channel", "This is the title of the stream", "arscan", 1);

            server.addStream(stream);

            stream.on('domain', function(){
                // this should have been picked up on the webserver too
                checkResponse("/", "robscanlon.com", function(data){
                    data.should.contain("Channel with gistid 1");
                    done();
                });

            });

            stream.setDomain("robscanlon.com");

        });
        it("should get a domain that was changed after the stream was created", function(done){
            var stream = new DataStream("channel", "This is the title of the stream", "arscan", 1, "robscanlon.com");

            server.addStream(stream);

            stream.on('domain', function(){
                // this should have been picked up on the webserver too
                checkResponse("/", "robscanlon2.com", function(data){
                    data.should.contain("Channel with gistid 1");
                    checkResponse("/", "robscanlon.com", function(data){
                        data.should.not.contain("Channel with gistid 1");
                        done();
                    });
                });

            });

            stream.setDomain("robscanlon2.com");

        });
        it("should get a domain that was changed after the stream was created with a www in the title or wierd case", function(done){
            var stream = new DataStream("channel", "This is the title of the stream", "arscan", 1, "example.com");

            server.addStream(stream);

            stream.on('domain', function(){
                // this should have been picked up on the webserver too
                checkResponse("/", "www.ROBSCANLON.com", function(data){
                    data.should.contain("Channel with gistid 1");
                    done();
                });

            });

            stream.setDomain("robscanlon.com");

        });
        it("should get a domain that was changed after the stream was created with a www in the title or another wierd case", function(done){
            var stream = new DataStream("channel", "This is the title of the stream", "arscan", 1, "example.com");

            server.addStream(stream);

            stream.on('domain', function(){
                // this should have been picked up on the webserver too
                checkResponse("/", "robscanlon.com", function(data){
                    data.should.contain("Channel with gistid 1");
                    done();
                });

            });

            stream.setDomain("www.RoBscanloN.com");

        });
    });
});

