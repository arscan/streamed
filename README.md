Streamed: A Streaming Data Visualization Platform 
---

**Streamed** is a streaming data visualization platform (name is subject to change).  It is intended to be a central place for people to share meaningful data streams and creative visualizations.  There are plenty of sites out there that aggregate large, static data sets.  But I'm more interested in data that is constantly changing, and visualizations that expose patterns or help draw meaning from that data.  

It is currently hosted at http://streams.robscanlon.com, but I will move it to a more appropriate domain (when I think of one).

I want to keep things simple, so my intent is to focus on data streams that are fairly low volume: 1 - 10 events per second.  And while it would be a fun challenge to try to build a platform that handles twitter-level volume (10,000+ events per second), that's not what I want to focus on in this project.  I want to focus on meaningful data that can be processed and visualized using no more than a couple of cheap VMs.

To get the ball rolling, I created a realtime stream of github updates, and hooked it up to a [visualization in the style of the 80's movie WarGames](http://streams.robscanlon.com/github). 

![Realtime Github Data, Wargames style ](https://raw.github.com/arscan/streamed/master/public/img/github_wargames_screenshot.png "Realtime Github Data, Wargames style")

Its a fun start, but my intent is to gather dozens more data streams, and put together dozens of visualizations.  I'd love your help if you find this interesting!

Architecture
---

The platform performs 2 major functions: data aggregation and data visualization.  These two pieces are connected by an [IRC](http://en.wikipedia.org/wiki/Internet_Relay_Chat) server.  While this may seem like a strange choice of messaging platforms, it allows for a fun default visualization for all data streams:

![IRC is used as the messaging platform](https://raw.github.com/arscan/streamed/master/public/img/irc_screenshot.png "IRC is used as the messaging platform")

It currently can be accessed at irc.robscanlon.com:6667 (subject to change) and uses Ratbox as the IRC daemon.

Just join a channel (e.g. #github) and watch the data fly by.  By using IRC, I can also avoid building all the standard, boilerplate management tools that typically come with these kinds of services (account management, stream management, yada yada yada).  I'm just not interested in spending my time building web forms when I can simply let IRC handle that for me.

Another convenient upside to using IRC is that it lowers the barrier for people to set up a new stream.  In order to create a new stream, just create a new IRC channel.  To start sending data, just start typing in that channel.  A default visualization will be populated on streams.robscanlon.com/channelname.  Of course, you'll want to use a bot to do the work for you, and every language has libraries that can help you with that.  Ownership of channels will simply be done using standard IRC rules (if you create it, you own it and can do what you wish inside).

The project isn't particularly well organized at the minute.  You'll find that there are a number of bots that are responsible for generating streams (in `/source_bots`).  There is at least one bot that performs general management (`prime-bot`), and other bots that are responsible for generating the web site and delivering the streaming data to the web clients through socket.io (`web-bot`).  Visualizations are located in the `/public/viz directory`.  I also will have at least a handful of support services that do things like transform ips and location names into lat/long coordinates.

This is designed in such a way to try to absolutely minimize the impact that i have on the services that I am using to get the data (generally through scraping).  I am only doing this for fun and it would be decidedly unfun to harm any other sites out there.

IRC Message Format
---

This is TBD.  It is very important that the messages are very human readable (while something like json would be machine-convenient, it would clutter up the IRC channel beyond belief).  Right now, the messages are just lists, separated by the \* character, and color coded.  But I'll need to make things a bit more standardized so that the messages encode metadata important to the visualization (like what field is the location).

How to Contribute
---

As you can tell, I'm in the early stages of this project.  But if you are interested in helping out, I could use help in tons of ways:

1. **Come up with fun, meaningful data streams.**  `tail -f /var/log/nginx/access.log`, while interesting to you, might be a bit dull to most other people.  Note that I personally don't mind if the data is pseudo-generated, as long as it is backed by some solid analysis.  For example, I think a stream of simulated births / deaths based on birth & death rate by country and by population density would be very cool.  Note that you can code these up and host them yourselves -- just point your bot at irc.robscanlon.com.  Please keep event rates at under 10/second, and of course, don't send me data that can't be publically distributed.

2. **Come up with unique, creative, awesome visualizations.**  They absolutely don't have to be geographically-focused.  In fact, I'd prefer if they weren't.  Again, since the IRC server is publically available, I don't necessarily have to host it.  But to start I think it might be better if they were incorporated in the project.  See `/public/viz` for the visualizations I'm working on now.  My hope is for visualizations to be mostly decoupled in content from the data it is showing (so you can mix and match streams with visualizations), but I realize that sometimes your visualization only really will apply to one set of data.

2. **Help me come up with a name.**  I released this a bit earlier than I had originally planned, so haven't really put thought into what this should be called.

3. **Fix bugs in existing visualizations, particularly around cross-browser functionality.** I know what i have in there has issues.  I'd love some help with that.

4. **Are you an IRC wizard?  Help!** I actually haven't ever run an IRC server before, so I'm running it a bit loose at the moment.  I'd love some advice on how to properly configure it to handle my somewhat unique requirements w/out compromising stability.

5. **Management Bots.** While I don't need to deal with creating web forms with my setup, I do need to have my bots handle things like visualization configuration, ensuring that everybody is a good citizen, etc.  If you like doing that kind of stuff, let me know.

6. **Tests.**  Yeah, sorry.  None of those yet.  If more than one person wants to help, I'll have to get some tests going.

7. **Information on data rights, licensing, etc.** This is just for fun, but I probably should get a little smarter about what can legally go on here.  If you are familiar with this kind of stuff, let me know.

7. **Words of encouragement** are always welcome.

8. **Money.** Worth a shot.

Rehosting
---

If you like what I've done, but want to rehost a single visualization with a single stream yourself, go for it.  You'll probably want to combine web-bot.js and the appropriate source stream bot into one, and ignore IRC altogether, which may take a little bit of work (but nodejs makes it dead easy).  And don't forget the support services!  Just some attribution back here would be nice.

License
---

The MIT License (MIT)
Copyright (c) 2013 Robert Scanlon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
