/*jshint expr: true*/

var EventEmitter = require('events').EventEmitter,
    DataStream = require('../lib/DataStream.js'),
    should = require('should'),
    util = require('util'),
    assert = require('assert');

describe("DataStream", function(){
    var stream = null;

    beforeEach(function(done){
        stream =  new DataStream('id','Title','arscan',54321,'domain.com');
        done();
    });

    describe("Constructor", function(){
        it("should have all the right stuff in place", function(done){
            stream.id.should.equal("id");
            stream.title.should.equal("Title");
            stream.gistuser.should.equal("arscan");
            stream.gistid.should.equal(54321);
            stream.domain.should.equal("domain.com");
            done();
        });
    });
});

