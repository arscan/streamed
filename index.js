var WebServer = require("./lib/WebServer.js"),
    StreamBot = require("./lib/StreamBot.js");


var server = WebServer.createWebServer("localhost", 8000);
var bot = StreamBot.createStreamBot({server:"irc.robscanlon.com"});
bot.emitter.on("stream", function(stream){
    server.addStream(stream);
});

// server.addStream(new DataStream("channel", "This is the title of the stream", "arscan", 1));



