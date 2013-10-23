/*jshint expr: true*/

var StreamBot = require('../lib/StreamBot.js'),
    MockIRCClient = require('./MockIRCClient.js'),
    EventEmitter = require('events').EventEmitter,
    should = require('should'),
    util = require('util'),
    assert = require('assert');

var PRIMEBOT = "prime",
    CONTROLCENTER = "#controlcenter";


describe("StreamBot", function(){
    var bot, ircClient;
    beforeEach(function(done){
        ircClient = new MockIRCClient();
        bot = StreamBot.createStreamBot(null, ircClient);
        done();
    });

    describe("Errors", function(){
        it("shouldn't die when there is an irc error", function(done){
            ircClient.emit("error", "message");
            done();
        });
    });

    describe("Control functions", function(){
        it("should connect to the command center section right away", function(){

            ircClient.inChannel(CONTROLCENTER).should.be.true;
        });

        it("should join a channel when told to by the prime bot", function(done){
            var channame = "#test" + Math.floor(Math.random() * 1000);

            ircClient.on('message', function(user,chan,message){
                if(user === PRIMEBOT && chan === CONTROLCENTER){
                    message.should.equal("New channel: " + channame);
                    ircClient.inChannel(channame).should.be.true;
                    bot.streams.should.have.property(channame.substring(1));
                    done();
                }
            });
            ircClient.sayfrom(PRIMEBOT, CONTROLCENTER,"New channel: " + channame);

        });

        it("should tell the world that its joining a channel when the prime bot tells it to", function(done){
            var channame = "#test" + Math.floor(Math.random() * 1000);

            ircClient.on('message', function(user,chan,message){
                if(user === "bot"){
                    message.should.equal("Joining " + channame);
                    done();
                }
            });
            ircClient.sayfrom(PRIMEBOT, CONTROLCENTER,"New channel: " + channame);
        });

        it("should leave a channel when told to by the prime bot", function(done){
            var channame = "#test" + Math.floor(Math.random() * 1000);

            ircClient.on('message', function(user,chan,message){
                if(user === "bot" && message === "Joining " + channame){
                    ircClient.inChannel(channame).should.be.true;
                    bot.streams.should.have.property(channame.substring(1));
                    ircClient.sayfrom(PRIMEBOT, CONTROLCENTER,"Dead channel: " + channame);
                } else if (user === "bot" && message === "Parting " + channame) {
                    ircClient.inChannel(channame).should.be.false;
                    bot.streams.should.not.have.property(channame.substring(1));
                    done();
                }
            });
            ircClient.sayfrom(PRIMEBOT, CONTROLCENTER,"New channel: " + channame);
        });

        describe("Topic Changes", function(){
            var channame = "#test" + Math.floor(Math.random() * 1000);

            beforeEach(function(done){
                ircClient.on('message', function(user, chan, message){
                    if(message.indexOf("Joining") === 0){
                        done();
                    }
                });
                ircClient.sayfrom(PRIMEBOT, CONTROLCENTER,"New channel: " + channame);
            });

            it("should parse topics with just titles", function(done){

                var topic = "This is the title";


                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].title.should.equal(topic);
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });

            it("should parse topics with just titles and gists", function(done){

                var topic = "[arscan/11234] This is the title";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].title.should.equal("This is the title");
                        bot.streams[channame.substring(1)].gistuser.should.equal("arscan");
                        bot.streams[channame.substring(1)].gistid.should.equal(11234);
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });
            
            it("should parse topics with a malformed gist", function(done){

                var topic = "[arscan11234] This is the title";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].title.should.equal("This is the title");
                        if( bot.streams[channame.substring(1)].gistid !== null){
                            throw { name: "System Error"};

                        }
                            
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });

            it("should parse topics with titles and domains", function(done){

                var topic = "%example.com% This is the title";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].title.should.equal("This is the title");
                        bot.streams[channame.substring(1)].domain.should.equal("example.com");
                        bot.domains.should.have.property("example.com");
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });

            it("should parse topics with titles and domains and gists", function(done){

                var topic = "[arscan/12345] %example.com% This is the title";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].title.should.equal("This is the title");
                        bot.streams[channame.substring(1)].domain.should.equal("example.com");
                        bot.streams[channame.substring(1)].gistid.should.equal(12345);
                        bot.streams[channame.substring(1)].gistuser.should.equal("arscan");
                        bot.domains.should.have.property("example.com");
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });
            
            it("should parse topics with titles and domains and gists reversed", function(done){

                var topic = "%example.com% [arscan/12345] This is the title";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].domain.should.equal("example.com");
                        bot.streams[channame.substring(1)].gistid.should.equal(12345);
                        bot.streams[channame.substring(1)].gistuser.should.equal("arscan");
                        bot.streams[channame.substring(1)].title.should.equal("This is the title");
                        bot.domains.should.have.property("example.com");
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });
            it("should parse topics with NO titles and domains and gists reversed", function(done){

                var topic = "%example.com% [arscan/12345]";

                ircClient.on('message', function(user,chan,message){
                    if(user === "bot" && message.indexOf("Topic change in " + channame) === 0){
                        bot.streams[channame.substring(1)].domain.should.equal("example.com");
                        bot.streams[channame.substring(1)].gistid.should.equal(12345);
                        bot.streams[channame.substring(1)].gistuser.should.equal("arscan");
                        bot.domains.should.have.property("example.com");
                        if( bot.streams[channame.substring(1)].title !== null){
                            throw { name: "System Error"};
                        }
                        done();
                    }
                });
                ircClient.topic(channame, topic);
            });

            it("should remove a domain if it changes", function(done){
                ircClient.on('message', function(user,chan,message){

                    if(user === "bot" && message.indexOf("Topic change in " + channame + " to %example.com% Title") === 0){
                        bot.domains.should.have.property("example.com");
                        bot.domains["example.com"].title.should.equal("Title");
                        ircClient.topic(channame, "%newexample.com% Second title");

                    } else if(user === "bot" && message.indexOf("Topic change in " + channame + " to %newexample.com% Second title") === 0){
                        bot.domains.should.not.have.property("example.com");
                        bot.domains.should.have.property("newexample.com");
                        bot.domains["newexample.com"].title.should.equal("Second title");
                        done();
                    }
                });
                ircClient.topic(channame, "%example.com% Title");
              
            });

            it("should remove a domain if it is deleted", function(done){
                ircClient.on('message', function(user,chan,message){

                    if(user === "bot" && message.indexOf("Topic change in " + channame + " to %example.com% Title") === 0){
                        bot.domains.should.have.property("example.com");
                        bot.domains["example.com"].title.should.equal("Title");
                        ircClient.topic(channame, "Just title");

                    } else if(user === "bot" && message.indexOf("Topic change in " + channame + " to Just title") === 0){
                        bot.domains.should.not.have.property("example.com");
                        done();
                    }
                });
                ircClient.topic(channame, "%example.com% Title");
              
            });

        });

    });
    describe("Incoming Messages", function(){
        var channame = "#test" + Math.floor(Math.random() * 1000),
            stream = null;

        beforeEach(function(done){
            ircClient.on('message', function(user, chan, message){
                if(message.indexOf("Joining") === 0){
                    stream = bot.streams[channame.substring(1)];
                    done();

                }
            });
            ircClient.sayfrom(PRIMEBOT, CONTROLCENTER, "New channel: " + channame);
        });

        it("should get messages sent to a given channel", function(done){
            stream.on('data', function(data){
                data.message.should.be.equal("Data!");
                done();
            });

            ircClient.sayfrom("somebot", channame, "Data!");
          
        });

    });
});







