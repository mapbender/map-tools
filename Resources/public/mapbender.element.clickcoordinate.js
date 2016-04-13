(function($) {
    function DefaultStringBuilder(separator_ordinates, separator_coordinates, decimal_metric, decimal_angular){
        this.sep_ord = separator_ordinates ? separator_ordinates : ' ';
        this.sep_coord = separator_coordinates ? separator_coordinates : ',';
        this.result = '';
        this.dec_metric = decimal_metric ? decimal_metric : 2;
        this.dec_angular = decimal_angular ? decimal_angular : 6;
        this.decimal = this.dec_metric;
        this.appendPoint = function(point){
            this.result += (this.result.length ? this.sep_coord : '') + point.x.toFixed(this.decimal) + this.sep_ord + point.y.toFixed(this.decimal);
        };
        this.resetResult = function(projection){
            this.decimal = projection.proj.units === 'degrees' || projection.proj.units === 'dd' ? this.dec_angular : this.dec_metric;
            var str = new String(this.result).toString();
            this.result = '';
            return str;
        };
    }
    function Geometry(projection, geom) {
        this.projection = projection;
        this.geom = geom;
        this.geomToString = function(string_builder){
            string_builder.resetResult(this.projection);
            if(this.geom instanceof OpenLayers.Geometry.MultiPoint) {
                for(var i = 0; i < this.geom.components.length; i++){
                    string_builder.appendPoint(this.geom.components[i]);
                }
                return string_builder.resetResult(this.projection);
            } else {
                throw new Error('other geometry type are not implemented');
            }
        };
        this.addGeom = function(projection, geom){
            if(this.geom instanceof OpenLayers.Geometry.MultiPoint && geom instanceof OpenLayers.Geometry.Point) {
                if(this.projection.projCode !== projection.projCode) {
                    this.geom.addPoint(geom.clone().transform(projection, this.projection));
                } else {
                    this.geom.addPoint(geom);
                }
            }
        }
    }
    function Transformer(){
        this.geom_internal = null;
        this.geom_external = null;
        this.setInternal = function(projection, geom, extern_projection){
            this.geom_internal = new Geometry(projection, geom);
            if(projection.projCode !== extern_projection.projCode){
                this.geom_external = new Geometry(extern_projection,
                    this.geom_internal.geom.clone().transform(projection, extern_projection));
            } else {
                this.geom_external = new Geometry(extern_projection, this.geom_internal.geom.clone());
            }
        };
        this.changeInternalProjection = function(projection){
            if(this.geom_internal && this.geom_internal.projection.projCode !== projection.projCode){
                this.geom_internal.geom = this.geom_internal.geom.transform(this.geom_internal.projection, projection);
                this.geom_internal.projection = projection;
                this.geom_external.geom = this.geom_internal.geom.clone().transform(this.geom_internal.projection, this.geom_external.projection);
            }
        };
        this.changeExternalProjection = function(projection){
            if(this.geom_external && this.geom_external.projection.projCode !== projection.projCode){
                this.geom_external.geom = this.geom_internal.geom.clone().transform(this.geom_internal.projection, projection);
                this.geom_external.projection = projection;
            }
        };
        
        this.internalToString = function(string_builder){
            return this.geom_internal ? this.geom_internal.geomToString(string_builder) : '';
        };
        
        this.externalToString = function(string_builder){
            return this.geom_external ? this.geom_external.geomToString(string_builder) : '';
        };
        
        this.addToInternal = function(projection, geom, extern_projection){
            if(!this.geom_internal){
                this.setInternal(projection, geom, extern_projection);
            } else {
                this.geom_internal.addGeom(projection, geom);
                if(this.geom_internal.projection.projCode !== extern_projection.projCode){
                    this.geom_external = new Geometry(extern_projection,
                        this.geom_internal.geom.clone().transform(this.geom_internal.projection, extern_projection));
                } else {
                    this.geom_external = new Geometry(extern_projection, this.geom_internal.geom.clone());
                }
            }
        };
    }
    $.widget("mapbender.mbMapClickCoordinate", {
        options: {
            target: null,
            type: 'dialog'
        },
        mbMap: null,
        containerInfo: null,
        mapClickHandler: null,
        activated: false,
        transformer: new Transformer(),
        features:[],
        ctrlPressed: false,
        _create: function() {
            if (!Mapbender.checkTarget("mbMapCoordinate", this.options.target)) {
                return;
            }
            Mapbender.elementRegistry.onElementReady(this.options.target, $.proxy(this._setup, this));
        },
        _setup: function() {
            var self = this;
            this.mbMap = $("#" + this.options.target).data("mapbenderMbMap");
//            this.srsDefs = this.mbMap.options.srsDefs;
            for (var i = 0; i < this.options.srsDefs.length; i++) {
                Proj4js.defs[this.options.srsDefs[i].name] = this.options.srsDefs[i].definition;
            }
            if (this.options.type === 'element') {
                this.containerInfo = new MapbenderContainerInfo(this, {
                    onactive:   function() {
                        self.activate(null);
                    },
                    oninactive: function() {
                        self.deactivate();
                    }
                });
            }
            this._trigger('ready');
            this._ready();
        },
        defaultAction: function(callback) {
            this.activate(callback);
        },
        activate: function(callback) {
            var self = this;
            var select = $('.inputSrs', this.element);
            select.html('');
            var tmp = {};
            for (var i = 0; i < this.options.srsDefs.length; i++) {
                tmp[this.options.srsDefs[i].name] = this.options.srsDefs[i].title;
                select.append($('<option></option>').val(this.options.srsDefs[i].name).html(this.options.srsDefs[i].title));
            }
            var allSrs = this.mbMap.getAllSrs();
            for (var i = 0; this.options.add_map_srs_list && i < allSrs.length; i++) {
                if(!tmp[allSrs[i].name]){
                    select.append($('<option></option>').val(allSrs[i].name).html(allSrs[i].title));
                }
            }
            var current = this.mbMap.getModel().getCurrentProj();
            if(this.options.srsDefs.length){
                select.val(this.options.srsDefs[0].name);
            } else {
                select.val(current.projCode);
            }
            
            $('input.mapSrs', this.element).val(current.projCode);
            if (this.options.type === 'element') {
                this._activateElement();
            } else if (this.options.type === 'dialog') {
                this._activateDialog();
            }
            initDropdown.call($('.dropdown', this.element).get(0));
            this.callback = callback ? callback : null;
            
            $(document).on('mbmapsrschanged', $.proxy(this._onSrsChanged, this));
            $(document).on('mbmapsrsadded', $.proxy(this._onSrsAdded, this));
            $('.copyClipBoard', this.element).on('click',  $.proxy(this._copyToClipboard, this));
            $('.buttonGroup .button.resetFields', this.element).on('click',  $.proxy(this._resetFields, this));

            this.mbMap.map.element.addClass('crosshair');
            this._resetFields();
            $('select.inputSrs', self.element).on('change', $.proxy(this._srsChanged, this));

            if(!this.mapClickHandler) {
                this.mapClickHandler = new OpenLayers.Handler.Click(this,
                    {'click': this._mapClick},
                    {map: this.mbMap.map.olMap}
                );
            }
            this.mapClickHandler.activate();
            $(window).on('keydown', $.proxy(this._keyDown, this));
            $(window).on('keyup', $.proxy(this._keyUp, this));
            this.activated = true;
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
            if(this.mapClickHandler) {
                this.mapClickHandler.deactivate();
            }
            $('select.inputSrs', this.element).off('change', $.proxy(this.srsChanged, this));
            $('#srsList', this.element).off('change', $.proxy(this._changeSrs, this));
            $('.copyClipBoard', this.element).off('click',  $.proxy(this._copyToClipboard, this));
            $('.buttonGroup .button.resetFields', this.element).off('click',  $.proxy(this._resetFields, this));
            $('select.inputSrs', this.element).off('change', $.proxy(this._srsChanged, this));
            
            $(document).off('mbmapsrschanged', $.proxy(this._onSrsChanged, this));
            $(document).off('mbmapsrsadded', $.proxy(this._onSrsAdded, this));
            $(window).off('keydown', $.proxy(this._keyDown, this));
            $(window).off('keyup', $.proxy(this._keyUp, this));
            
            this.mbMap.element.removeClass('crosshair');
            this.callback ? this.callback.call() : this.callback = null;
            this._removeFeature();
            this.ctrlPressed = false;
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
        _keyDown: function(e){
            if (e.which == 17) { // ctrl
                this.ctrlPressed = true;
            }
        },
        _keyUp: function(e){
            if (e.which == 17) { // ctrl
                this.ctrlPressed = false;
            }
        },
        _srsChanged: function(event, srsObj){
            this.transformer.changeExternalProjection(Mapbender.Model.getProj($('select.inputSrs', this.element).val()));
            this._updateFileds();
        },
        _onSrsChanged: function(event, srsObj){
            this.transformer.changeInternalProjection(Mapbender.Model.getCurrentProj());
            this._updateFileds();
        },
        _onSrsAdded: function(event, srsObj){
            $('.inputSrs', this.element).append($('<option></option>').val(srsObj.name).html(srsObj.title));
        },
        _copyToClipboard: function(e){
            $(e.target).parent().find('input').select();
             document.execCommand("copy");
        },
        
        _resetFields: function(e){
            this.transformer.geom_internal = null;
            this.transformer.geom_external = null;
            this._updateFileds();
        },
        _updateFileds: function(){
            var stringBuilder = new DefaultStringBuilder();
            $('input.mapCoordinate', this.element).val(this.transformer.internalToString(stringBuilder));
            $('input.inputCoordinate', this.element).val(this.transformer.externalToString(stringBuilder));
            this._showFeature();
        },
        _showFeature: function(){
            if(this.transformer.geom_internal){
                this.feature = [new OpenLayers.Feature.Vector(this.transformer.geom_internal.geom)];
                Mapbender.Model.highlightOn(this.feature, {clearFirst: true, "goto": false});
            }
        },
        _removeFeature: function(){
            if(this.feature) {
                Mapbender.Model.highlightOff(this.feature);
            }
        },
        _mapClick: function(e){
            var projection = Mapbender.Model.getCurrentProj();
            var projection_extern = Mapbender.Model.getProj($('select.inputSrs', self.element).val());
            var lonlat = this.mbMap.map.olMap.getLonLatFromPixel(e.xy);
            var click_point = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
            if(this.ctrlPressed){
                this.transformer.addToInternal(projection, click_point, projection_extern);
            } else {
                this.transformer.setInternal(projection, new OpenLayers.Geometry.MultiPoint([click_point]), projection_extern);
            }
            this._updateFileds();
            return false;
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
})(jQuery);
//overwrite a function
Mapbender.Model.getProj= function(srscode) {
    var proj = null;
    for(var name in Proj4js.defs){
        if(srscode === name){
            proj = new OpenLayers.Projection(name);
            if (!proj.proj.units) {
                proj.proj.units = 'degrees';
            }
            return proj;
        }
    }
    return proj;
};
