var util = require('util'),
   EventEmitter = require('events').EventEmitter;
/*
 * MockIRCClient: this is a mock IRC client to make sure that the bot is working properly
 *
 */

function MockIRCClient(){
    var self = this;
    
    self.channels = {};
    

}
util.inherits(MockIRCClient,EventEmitter);

MockIRCClient.prototype.inChannel = function(chan){
    return typeof(this.channels[chan]) !== 'undefined';
};

MockIRCClient.prototype.join = function(chan){
    this.channels[chan] = true;
};
MockIRCClient.prototype.part = function(chan){
    if(this.channels[chan]){
        delete this.channels[chan];

    }
};
MockIRCClient.prototype.topic = function(chan, topic){
    this.emit("topic", chan, topic);
};

MockIRCClient.prototype.say = function(chan,message){
    this.sayfrom("bot",chan,message);

};
MockIRCClient.prototype.sayfrom = function(from,chan,message){
    this.emit("message",from,chan,message);
};


module.exports = MockIRCClient;
