/*jshint expr: true*/

var EventEmitter = require('events').EventEmitter,
DataStream = require('../lib/DataStream.js'),
MockIPServer = require('../test/lib/MockIPServer.js'),
MockLocationServer = require('../test/lib/MockLocationServer.js'),
should = require('should'),
util = require('util'),
http = require('http'),
assert = require('assert');


describe("DataStream", function(){
    var stream = null,
    locserver,
    ipserver,
    streamConfig = { locationToLatLngServer: "http://localhost:3000", IPv4ToLatLngServer: "http://localhost:3001"};

    /* 
     * Set up some the dummy services that this needs
     * location server that translates from something like "Boston, MA" to a latlng
     * ipv6 server that translates ip to a latlng
     *
     */

    before(function(){
        ipserver = MockIPServer.createIPServer(streamConfig["IPv4ToLatLngServer"].split(":")[2]);
        locserver = MockLocationServer.createLocationServer(streamConfig["locationToLatLngServer"].split(":")[2]);
    });

    /*
     * Close the dummy services
     */

    after(function(){
        ipserver.close();
        locserver.close();
    });


    /*
     * Main tests
     */

    beforeEach(function(done){
        stream =  new DataStream('id','Title','arscan',54321,'vizdomain.com', streamConfig);
        done();
    });

    describe("Constructor", function(){
        it("should have all the right stuff in place", function(done){
            stream.id.should.equal("id");
            stream.title.should.equal("Title");
            stream.gistuser.should.equal("arscan");
            stream.gistid.should.equal(54321);
            stream.vizdomain.should.equal("vizdomain.com");
            done();
        });
    });
    describe("#send", function(){
        it("should send simple events", function(done){
            stream.on('data',function(data){
                done();
            });
            stream.send('This is a message');
        });
        it("should send events with a good location", function(done){
            stream.on('data',function(data){
                if(data.location && data.location.lat && data.location.lng){
                    done();
                }
            });
            stream.send('This is a message from [Boston]');
        });
        it("should send events on an unknown location", function(done){
            stream.on('data',function(data){
                data.should.have.property("location");
                data.location.should.have.property("name");
                data.location.should.not.have.property("lat");
                data.location.should.not.have.property("long");
                done();
            });
            stream.send('This is a message from [Unknown]');
        });
        it("should work on location that causes a malformed json response from the location server", function(done){
            stream.on('data',function(data){
                data.should.have.property("location");
                data.location.should.have.property("name");
                data.location.should.not.have.property("lat");
                data.location.should.not.have.property("long");
                done();
            });
            stream.send('This is a message from [Malformed]');
        });
        it("should work on location that causes an error on the location server", function(done){
            stream.on('data',function(data){
                data.should.have.property("location");
                data.location.should.have.property("name");
                data.location.should.not.have.property("lat");
                data.location.should.not.have.property("long");
                done();
            });
            stream.send('This is a message from [Error]');
        });
        it("should not break when the location server isn't up", function(done){
            var brokenStream =  new DataStream('id','Title','arscan',54321,'vizdomain.com', {locationToLatLngServer: "http://broke", IPv4ToLatLngServer: "http://broke"});

            brokenStream.on('data',function(data){
                done();
            });
            brokenStream.send('This is a message from [Boston]');
        });

        it("should send events with a good ipv4", function(done){
            stream.on('data',function(data){
                data.location.name.should.be.equal("Waltham, US");
                data.location.should.have.property("lat");
                data.location.should.have.property("lng");
                done();
            });
            stream.send('This is a message from [204.215.129.226]');
        });

        it("should send events with a good ipv4 that doesn't know the city but does know the country", function(done){
            stream.on('data',function(data){
                data.location.name.should.be.equal("United States");
                data.location.should.have.property("lat");
                data.location.should.have.property("lng");
                done();
            });
            stream.send('This is a message from [5.5.5.5]');
        });

        it("should not break on a bad ip", function(done){
            stream.on('data',function(data){
                assert(!data.location);
                done();
            });
            stream.send('This is a message from [500.0.0.0]');
        });

        it("should not break when service returns a 500", function(done){
            stream.on('data',function(data){
                assert(!data.location);
                done();
            });
            stream.send('This is a message from [0.0.0.0]');
        });

        it("should not break when the ip server isn't up", function(done){

            var brokenStream =  new DataStream('id','Title','arscan',54321,'vizdomain.com', {locationToLatLngServer: "http://broke", IPv4ToLatLngServer: "http://broke"});

            brokenStream.on('data',function(data){
                done();
            });
            brokenStream.send('This is a message from [204.111.111.111]');


        });
    });
    describe("#close", function(){
        it("should close the stream", function(done){

            stream.on('close', function(id){
                id.should.equal("id");
                done();
            });
            stream.close();
        });
    });
});

