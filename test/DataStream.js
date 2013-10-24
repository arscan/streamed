/*jshint expr: true*/

var EventEmitter = require('events').EventEmitter,
DataStream = require('../lib/DataStream.js'),
should = require('should'),
util = require('util'),
http = require('http'),
assert = require('assert');


describe("DataStream", function(){
    var stream = null,
    locserver,
    ipserver,
    streamConfig = { locationToLatLngServer: "http://localhost:3000",
        IPv4ToLatLngServer: "http://localhost:3001"};

        /* 
         * Set up some the dummy services that this needs
         * location server that translates from something like "Boston, MA" to a latlng
         * ipv6 server that translates ip to a latlng
         *
         */

        before(function(){
            ipserver = http.createServer(function(request, response) {
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

            }).listen(streamConfig["IPv4ToLatLngServer"].split(":")[2]);

            locserver = http.createServer(function(request, response) {
                if(request.url === "/Boston"){
                    response.writeHead(200, {"Content-Type": "application/json"});
                    response.write('{"lat":"42.35943","lng":"-71.15977"}');
                    response.end();
                } else if (request.url === "/Unknown") {
                    response.writeHead(200, {"Content-Type": "application/json"});
                    response.write('{}');
                    response.end();
                } else if (request.url === "/Malformed") {
                    response.writeHead(200, {"Content-Type": "text/plain"});
                    response.write('Malformed Json Response');
                    response.end();
                } else if (request.url === "/Error") {
                    response.writeHead(500, {"Content-Type": "text/plain"});
                    response.write('Error');
                    response.end();
                }
            }).listen(streamConfig["locationToLatLngServer"].split(":")[2]);

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
});

