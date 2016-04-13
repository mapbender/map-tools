(function($) {
 // TODO migration from mapcoordinate to searchcoordinate 
    var POINT = 'point';
    var MULTIPOINT = 'multipoint';
    var ORDINATES_REGEX = new RegExp(/^(-?[0-9]+([.][0-9]+([eE][0-9]+)?)?[\s,]-?[0-9]+([.][0-9]+([eE][0-9]+)?)?)+$/);
    var SEPARATOR_REGEX = new RegExp(/[\s,]/);
    function parseCoords(coordsText) {
        // string for coordinates input int/float values seaprated with a blank or a colone
        var data = ORDINATES_REGEX.exec(coordsText);
        if (data && data[0]) {
            var ordinates = data[0].split(SEPARATOR_REGEX);
            if(ordinates.length > 1){
                return ordinates;
            }
        }
        return null;
    }
    function Geometry(srs, ordinates, dim, type) {
        this.srs = srs;
        /* The attribute "ordinates" is a single-dimensional array and supports only types POINT, MULTIPOINT,
         *  LINESTRING, POLYGON(only exterior ring).
         * Geometry types LINESTRING, POLYGON are not yet implemented
        */
        this.ordinates = [];
        if(typeof ordinates === 'string'){ // string
            this.ordinates = ordinates.split(/[\s,]/);
        } else { // array
            this.ordinates = ordinates;
        }
        this.dim = dim ? dim : 2;
        this.type = type;
        this.ordinatesToString = function(ordinates_separator, coordinates_separator){
            var str = '';
            for(var i = dim -1; i < this.ordinates.length; i = i + dim){
                str += i === dim -1 ? '': coordinates_separator + coordinates_separator;
                for(var j = 0; j < dim; j++){
                    str += j === 0 ? '' : ordinates_separator + this.ordinates[i + j - (dim - 1)];
                }  
            }
        };
    }
    function Transformer(){
        this.geom_intern = null;
        this.geom_extern = null;
        this.setIntern = function(srs, ordinates, dim, type, srs_extern){
            this.geom_intern = new Geometry(srs, ordinates, dim, type);
        };
        this.addIntern = function(srs, ordinates, dim, type){
            if(this.geom_intern === null){
                this.setIntern(srs, ordinates, dim, type);
            } else if(this.geom_intern.srs == srs && this.geom_intern.dim === dim) {
                if((type === POINT || type === MULTIPOINT)
                        && (this.geom_intern.type === POINT || this.geom_intern.type === POINT)){
                    this.geom_intern.type = MULTIPOINT;
                    this.geom_intern.ordinates = this.geom_intern.ordinates.concat(ordinates);
                } else {
                    throw new Error('not yet implemented geometry type: ' + type);
                }
            } else {
                throw new Error('The given srs ore dimension is/are not compatible with existing data.');
            }
        };
    }
    $.widget("mapbender.mbMapSearchCoordinate", {
        options: {
            target: null,
            type: 'dialog'
        },
        mbMap: null,
        containerInfo: null,
        _create: function() {
            if (!Mapbender.checkTarget("mbMapSearchCoordinate", this.options.target)) {
                return;
            }
            Mapbender.elementRegistry.onElementReady(this.options.target, $.proxy(this._setup, this));
        },
        _setup: function() {
            
        },
        defaultAction: function(callback) {
            this.activate(callback);
        },
        activate: function(callback) {
            
        },
        _activateElement: function() {
            var self = this;
            this.element.removeClass('hidden');
        },
        _activateDialog: function() {
            var self = this;
            if (!this.popup || !this.popup.$element) {
                this.popup = new Mapbender.Popup2({
                    title: self.element.attr('data-title'),
                    draggable: true,
                    modal: false,
                    closeButton: false,
                    closeOnESC: false,
                    content: this.element.removeClass('hidden'),
                    resizable: true,
                    width: 450,
                    height: 354,
                    buttons: {}
                });
                this.popup.$element.on('close', function() {
                    self.deactivate();
                });
                this.popup.$element.on('open', function() {
                    self.state = 'opened';
                });
            }
            this.popup.open();
        },
        deactivate: function() {
            if (this.options.type === 'element') {
                this._deactivateElement();
            } else if (this.options.type === 'dialog') {
                this._deactivateDialog();
            }

            //TODO
            this.activated = false;
        },
        _deactivateElement: function() {
            ;
        },
        _deactivateDialog: function() {
            if (this.popup) {
                if (this.popup.$element) {
                    $('body').append(this.element.addClass('hidden'));
                    this.popup.destroy();
                }
                this.popup = null;
            }
        },
        /**
         *
         */
        ready: function(callback) {
            if (this.readyState === true) {
                callback();
            } else {
                this.readyCallbacks.push(callback);
            }
        },
        /**
         *
         */
        _ready: function() {
            for (callback in this.readyCallbacks) {
                callback();
                delete(this.readyCallbacks[callback]);
            }
            this.readyState = true;
        },
        _destroy: $.noop
    });
    
    // TODO
})(jQuery);    