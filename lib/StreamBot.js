var _ = require('underscore'),
    irc = require('irc'),
    events = require('events'),
    DataStream = require('./DataStream.js');

var createStreamBot = function(opts, client){

    var ircClient = client,
    options = _.extend({
        server: "localhost",
        nick: "web" + Math.floor(Math.random() * 1000),
        controlchannel: "#controlcenter",
        admins: ["prime", "arscan"],
    },opts),
    eventEmitter = new events.EventEmitter(),
    streams = {},
    domains = {};


    // Create an irc client if I wasn't passed in one
    if(!ircClient){
        ircClient = new irc.Client(options.server, options.nick, { debug: true, 
                                   showErrors: true, 
                                   floodProtection: false, 
                                   floodProtectionDelay: 0

        });
    }

    // join the controlcenter as soon as we are starting up
    ircClient.join(options.controlchannel);

    /* 
     * -------------- PRIVATE FUNCTIONS ---------------------------
     */

    /* channel to id: helper to get rid of the leading # */
    function cti(channel){
        return channel.substring(1);
    }

    function joinChannel(channelname){
        /* we are already in a channel */
        if(streams[cti(channelname)]){ 
            return;
        }
// function DataStream(id, title, gistuser, gistid, vizdomain, config){

        streams[cti(channelname)] = new DataStream(cti(channelname), null, null, null, null);
        ircClient.join(channelname);
        ircClient.say("#controlcenter", "Joining " + channelname);
    }

    function partChannel(channelname){
        /* we are not in that channel */
        if(!streams[cti(channelname)]){ 
            return;
        }

        delete streams[cti(channelname)];
        ircClient.part(channelname);
        ircClient.say("#controlcenter", "Parting " + channelname);

    }

    function controlMessage(message){
        // an admin is telling me to do something
    
        if(message.indexOf("New channel: ")=== 0){
            joinChannel(message.substring("New channel: ".length, message.length));
        } else if (message.indexOf("Dead channel: ") === 0){
            partChannel(message.substring("Dead channel: ".length, message.length));
        }
    }

    function topicChange(channel, topic){
        var streamid = cti(channel),
            domain = null,
            gistid = null,
            gistuser = null,
            title = null,
            prevdomain = null;

        if(!streams[streamid]){
            return;
        }
        prevdomain = streams[streamid].domain; // save this for removing later if needed


        // Bear with me, some ugly regexp here
        // general form: %domainname.com% [gistuser/5555] Topic
        // domain and the default gist visualization are optional, and can be switched around (but Topic must be after both)

        var vizparsed = /\[([^\]]*)\]/.exec(topic);
        var domainparsed = /%([^%]*)%/.exec(topic);

        if(vizparsed && vizparsed[1] && vizparsed[1].split("/").length > 1 && !isNaN(parseInt(vizparsed[1].split("/")[1], 10))){
            gistuser = vizparsed[1].split("/")[0];
            gistid = parseInt(vizparsed[1].split("/")[1], 10);
        }
        if(domainparsed){
            domain = domainparsed[1];
        }

        title = topic.substring(Math.max(topic.lastIndexOf("%"), topic.lastIndexOf("]")) + 1).trim();
        if(!title.length){
            title = null;
        }

        // done with the ugly regexp
        
        streams[streamid].title = title;
        streams[streamid].domain = domain;
        streams[streamid].gistid = gistid;
        streams[streamid].gistuser = gistuser;

        if(domain !== null){
            domains[domain] = streams[streamid];
        } 

        // Remove the old domain if changed or deleted
        
        if (prevdomain !== null && prevdomain !== domain){
            delete domains[prevdomain];
        }

        ircClient.say("#controlcenter", "Topic change in " + channel + " to " + topic);

    }

    /* 
     * -------------- IRC HANDLERS ---------------------------
     */

    ircClient.on('error', function(message) {
        eventEmitter.emit('info', 'IRC Error: ' + message);
    });

    ircClient.on('message', function(from, to, message){
        // console.log("to: " + to + " from: " + from + " message: " + message);
        if(_.contains(options["admins"], from)){
            controlMessage(message);
            return;
        } 

        if(streams[cti(to)]){
            streams[cti(to)].send(message);
        }


        return;
    });

    ircClient.on('topic', function(channel, topic){
        topicChange(channel, topic);
    });

    /* 
     * -------------- Reveal public properties ---------------------------
     */

    return {
        streams: streams,
        domains: domains,
        emitter: eventEmitter // use composition instead of inheritance, just because
    };
};

module.exports.createStreamBot = createStreamBot;

