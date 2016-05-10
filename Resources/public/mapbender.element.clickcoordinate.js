(function($) {
    function SimpleStringBuilder(separator_ordinates, separator_coordinates, fractiondigit, reverse_ordinates){
        var _reverse = false;
        var _result = null;
        var _sep_ord = null;
        var _sep_coord = null;
        var _fraction = null;
        this.init = function(separator_ordinates, separator_coordinates, fractiondigit, reverse_ordinates){
            _result = '';
            _sep_ord = String.fromCharCode(separator_ordinates);
            _sep_coord = String.fromCharCode(separator_coordinates);
            _fraction = fractiondigit;
            _reverse = reverse_ordinates;
        };
        this.init(separator_ordinates, separator_coordinates, fractiondigit, reverse_ordinates);
        this.appendPoint = function(point){
            _result += _result.length ? _sep_coord : '';
            if(_reverse){
                _result += point.y.toFixed(_fraction) + _sep_ord + point.x.toFixed(_fraction);
            } else {
                _result += point.x.toFixed(_fraction) + _sep_ord + point.y.toFixed(_fraction);
            }
        };
        this.getResult = function(){
            return _result;
        };
    }
    function ClickGeometry(projection, geom) {
        var _projection = null;
        var _geom = null;
        this.init = function(projection, geom){
            _projection = projection;
            if(!geom) {
                _geom = new OpenLayers.Geometry.Collection();
            } else if(geom instanceof OpenLayers.Geometry.Collection) {
                _geom = geom.clone();
            } else {
                _geom = new OpenLayers.Geometry.Collection(geom);
            }
        };
        this.init(projection, geom);
        
        this.isEnabled = function(){
            return _projection && _geom;
        };
        
        this.getGeom = function(){
            return _geom;
        };
        this.geomToString = function(separator_ordinates, separator_coordinates){
            var decimal = _projection.proj.units === 'degrees' || _projection.proj.units === 'dd' ? 6 : 2;
            var reverse = false; // to check for projection
            var builder = new SimpleStringBuilder(separator_ordinates, separator_coordinates, decimal, reverse);
            for(var i = 0; i < _geom.components.length; i++){
                builder.appendPoint(_geom.components[i]);
            }
            return builder.getResult();
        };
        this.addGeom = function(projection, geom){
            if(_projection.projCode !== projection.projCode) {
                _geom.addComponents(geom.clone().transform(projection, _projection));
            } else {
                _geom.addComponents(geom.clone());
            }
        };
        this.transform = function(projection){
            if(_projection.projCode !== projection.projCode) {
                _geom.transform(_projection, projection);
                _projection = projection;
            }
        };
        this.clone = function(projection){
            var geom = new ClickGeometry(_projection, _geom);
            geom.transform(projection);
            return geom;
        }
    }
    
    $.widget("mapbender.mbMapClickCoordinate", {
        options: {
            target: null,
            type: 'dialog',
            sep_ord_field: 32, // only ascii, 32 -> " "
            sep_coord_field: 44, // only ascii, 44 -> ","
            sep_ord_clipboard: 44, // only ascii, 44 -> ","
            sep_coord_clipboard: 10 // only ascii, 10 -> "\n"
        },
        mbMap: null,
        containerInfo: null,
        mapClickHandler: null,
        activated: false,
        clickGeom: null,
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
            this.options.sep_ord_field = parseInt(this.options.sep_ord_field);
            this.options.sep_coord_field = parseInt(this.options.sep_coord_field);
            this.options.sep_ord_clipboard = parseInt(this.options.sep_ord_clipboard);
            this.options.sep_coord_clipboard = parseInt(this.options.sep_coord_clipboard);
            this.mbMap = $("#" + this.options.target).data("mapbenderMbMap");
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
            $('.copyClipBoard', this.element).on('click',  $.proxy(this._clickCopy, this));
            $('.buttonGroup .button.resetFields', this.element).on('click',  $.proxy(this._resetFields, this));

            this.mbMap.map.element.addClass('crosshair');
            this.clickGeom = new ClickGeometry(Mapbender.Model.getCurrentProj(), null);
            this._resetFields();
            $('select.inputSrs', self.element).on('change', $.proxy(this._srsChanged, this));

            if(!this.mapClickHandler) {
                this.mapClickHandler = new OpenLayers.Handler.Click(this,
                    {'click': this._mapClick},
                    {map: this.mbMap.map.olMap}
                );
            }
            this.mapClickHandler.activate();
            $('.coords-extern .collapsible .checkbox', self.element).on('change', $.proxy(this._collapseExtern, this));
            this.activated = true;
        },
        _collapseExtern: function(e) {
            if($(e.target).prop('checked')){
                $(e.target).parents('.coords-extern:first').addClass('opened');
            } else {
                $(e.target).parents('.coords-extern:first').removeClass('opened');
            }
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
            $('.copyClipBoard', this.element).off('click',  $.proxy(this._clickCopyToClipboard, this));
            $('.buttonGroup .button.resetFields', this.element).off('click',  $.proxy(this._resetFields, this));
            $('select.inputSrs', this.element).off('change', $.proxy(this._srsChanged, this));
            
            $(document).off('mbmapsrschanged', $.proxy(this._onSrsChanged, this));
            $(document).off('mbmapsrsadded', $.proxy(this._onSrsAdded, this));
            
            this.mbMap.element.removeClass('crosshair');
            this.callback ? this.callback.call() : this.callback = null;
            this._removeFeature();
            this.ctrlPressed = false;
            this.activated = false;
            this.clickGeom = null;
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
        _srsChanged: function(event, srsObj){
            this._updateFileds();
        },
        _onSrsChanged: function(event, srsObj){
            this.clickGeom.transform(Mapbender.Model.getCurrentProj());
            this._updateFileds();
        },
        _onSrsAdded: function(event, srsObj){
            $('.inputSrs', this.element).append($('<option></option>').val(srsObj.name).html(srsObj.title));
        },
        _clickCopy: function(e){
            var $input = $(e.target).parent().find('input');
            var clickgeom = null;
            if($input.hasClass('inputCoordinate')) {
                clickgeom = this.clickGeom.clone(Mapbender.Model.getProj($('select.inputSrs', this.element).val()));
                this._copyToClipboard(clickgeom.geomToString(this.options.sep_ord_clipboard, this.options.sep_coord_clipboard));
                $input.select();
            } else if($input.hasClass('mapCoordinate')){
                this._copyToClipboard(this.clickGeom.geomToString(this.options.sep_ord_clipboard, this.options.sep_coord_clipboard));
                $input.select();
            }
        },
        _copyToClipboard: function(text){
            var $temp = $('<textarea></textarea>');
            $('body').append($temp);
            $temp.val(text);
            $temp.select();
            document.execCommand("copy");
            $temp.remove();
        },
        _resetFields: function(e){
            this.clickGeom = new ClickGeometry(Mapbender.Model.getCurrentProj(), null);
            this._updateFileds();
        },
        _updateFileds: function(){
            if(this.clickGeom.isEnabled()){
                $('input.mapCoordinate', this.element).val(this.clickGeom.geomToString(this.options.sep_ord_field, this.options.sep_coord_field));
                var cloned = this.clickGeom.clone(Mapbender.Model.getProj($('select.inputSrs', this.element).val()));
                $('input.inputCoordinate', this.element).val(cloned.geomToString(this.options.sep_ord_field, this.options.sep_coord_field));
            } else {
                $('input.mapCoordinate', this.element).val('');
                $('input.inputCoordinate', this.element).val('');
            }
            this._showFeature();
        },
        _showFeature: function(){
            if(this.clickGeom.isEnabled()){
                this.feature = [new OpenLayers.Feature.Vector(this.clickGeom.getGeom())];
                Mapbender.Model.highlightOn(this.feature, {clearFirst: true, "goto": false});
            } else {
                this._removeFeature();
            }
        },
        _removeFeature: function(){
            if(this.feature) {
                Mapbender.Model.highlightOff(this.feature);
            }
        },
        _mapClick: function(e){
            var lonlat = this.mbMap.map.olMap.getLonLatFromPixel(e.xy);
            var click_point = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
            if(e.ctrlKey){
                 this.clickGeom.addGeom(Mapbender.Model.getCurrentProj(), click_point);
            } else {
                this.clickGeom = new ClickGeometry(Mapbender.Model.getCurrentProj(), click_point);
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