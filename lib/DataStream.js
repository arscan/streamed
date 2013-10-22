
var util = require('util'),
   EventEmitter = require('events').EventEmitter;

function DataStream(id, title, gistuser, gistid, domain){
    this.id = id;
    this.title = title;
    this.gistuser = gistuser;
    this.gistid = gistid;
    this.domain = domain;
    

}
util.inherits(DataStream,EventEmitter);


// MockIRCClient.prototype.inChannel = function(chan){
//     return typeof(this.channels[chan]) !== 'undefined';
// };


module.exports = DataStream;
