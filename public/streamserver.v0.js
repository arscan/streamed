var StreamServer = (function () {

    var onMessageFn = function(){};
    var onStreamLoadedFn = function(){};

    /* private function */


    var loadScript = function(url, callback)
    {
        // Adding the script tag to the head as suggested before
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;

        // Fire the loading
        head.appendChild(script);
    };

    /* public functions */

    var onStreamLoaded = function(cb) {
        onStreamLoadedFn = cb;
    }

    var onMessage = function(cb) {
        onMessageFn = cb;
    }

    /* run this now */

    loadScript("/socket.io/socket.io.js", function(){
        var socket = io.connect(document.URL.split("/").slice(0,3).join("/"));

        socket.on('data', function (datain) {
            onMessageFn(datain);
        });

        socket.on('connect', function() {
            socket.emit('subscribe', document.URL.split("/")[3]);
        });

        socket.on('subscribed', function(channelsub) {
            // TODO: return the topics
            onStreamLoadedFn();
        });

    });

    /* expose what we want */

    return {
        onStreamLoaded: onStreamLoaded,
        onMessage: onMessage
    };
}());
