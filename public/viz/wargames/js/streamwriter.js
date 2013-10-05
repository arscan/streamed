
(function ( $ ) {
    $.widget( "arscan.streamwriter", {
        options: {
            enabled: true,
            timeout: 50,
            charblock: 6,
            maxlines: 7,
        },
    _currentline: {},
    _currentlinecount:{},
    _queue: {},
    _create: function() {
        var self = this;
        self._currentline[self.element[0].id] = self.element.text();
        self._currentlinecount[self.element[0].id] = 0;
        self._queue[this.element[0].id] = [];
        self.element.empty();
        var loop = function(){

            setTimeout(loop, self.options.timeout);
            self._typewrite();

        }
        if(self.options.enabled)
            loop();
    },
    write: function(text){
        if(this.options.enabled){
            this._queue[this.element[0].id].push(text);
        } else {
            this._currentlinecount[this.element[0].id]++;
            this.element.append(document.createElement("br"));
            if(this._currentlinecount[this.element[0].id] > this.options.maxlines){
                this._currentlinecount[this.element[0].id]=0;
                this.element.empty();

            }
            this.element.append(document.createTextNode(text));
        }

    },
    _typewrite: function(){

        if(this._currentline[this.element[0].id].length > 0){
            this.element.append(document.createTextNode(this._currentline[this.element[0].id].substring(0,this.options.charblock)));
            this._currentline[this.element[0].id] = this._currentline[this.element[0].id].slice(this.options.charblock);

        } else if (this._queue[this.element[0].id].length > 0){
            this._currentlinecount[this.element[0].id]++;
            this.element.append(document.createElement("br"));
            if(this._currentlinecount[this.element[0].id] > this.options.maxlines){
                this._currentlinecount[this.element[0].id]=0;
                this.element.empty();

            }
            this._currentline[this.element[0].id] = this._queue[this.element[0].id].shift();
        }
    }

    });
})(jQuery);
