// ==UserScript==
// @name           iCheckMovies Enhanced
// @namespace      iCheckMovies
// @description    Adds new features to enhance the iCheckMovies user experience
// @version        1.6.1
// @include        http://icheckmovies.com*
// @include        http://www.icheckmovies.com*
// @include        https://icheckmovies.com*
// @include        https://www.icheckmovies.com*
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_addStyle
// ==/UserScript==

/*
 * jqModal - Minimalist Modaling with jQuery
 *
 * Copyright (c) 2007-2014 Brice Burgess @iceburg_net
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * $Version: 1.0.2 (2014.04.10 +r19)
 * Requires: jQuery 1.2.3+
 */
(function(e){e.fn.jqm=function(t){var n=e.extend({},e.jqm.params,t);return this.each(function(){var t=e(this),r=e(this).data("jqm");if(!r)r={ID:c++};t.data("jqm",e.extend(n,r)).addClass("jqm-init");n.trigger&&e(this).jqmAddTrigger(n.trigger)})};e.fn.jqmAddTrigger=function(n){return this.each(function(){if(!o(e(this),"jqmShow",n))t("jqmAddTrigger must be called on initialized modals")})};e.fn.jqmAddClose=function(n){return this.each(function(){if(!o(e(this),"jqmHide",n))t("jqmAddClose must be called on initialized modals")})};e.fn.jqmShow=function(t){return this.each(function(){!this._jqmShown&&n(e(this),t)})};e.fn.jqmHide=function(t){return this.each(function(){this._jqmShown&&r(e(this),t)})};var t=function(e){if(window.console&&window.console.error)window.console.error(e)},n=function(t,n){var r=t.data("jqm"),n=n||window.event,i=parseInt(t.css("z-index")),i=i>0?i:3e3,s=e("<div></div>").addClass(r.overlayClass).css({height:"100%",width:"100%",position:"fixed",left:0,top:0,"z-index":i-1,opacity:r.overlay/100}),o={w:t,c:r,o:s,t:n};t.css("z-index",i);if(r.ajax){var a=r.target||t,f=r.ajax;a=typeof a=="string"?e(a,t):e(a);if(f.substr(0,1)=="@")f=e(n).attr(f.substring(1));a.html(r.ajaxText).load(f,function(){r.onLoad&&r.onLoad.call(this,o);u(o)})}else{u(o)}},r=function(e,t){var n=e.data("jqm"),t=t||window.event,r={w:e,c:n,o:e.data("jqmv"),t:t};a(r)},i=function(t){if(t.c.overlay>0)t.o.prependTo("body");t.w.show();e.jqm.focusFunc(t.w);return true},s=function(e){e.w.hide()&&e.o&&e.o.remove();return true},o=function(t,n,r){if(!t.data("jqm"))return false;return e(r).each(function(){this[n]=this[n]||[];this[n].push(t)}).click(function(){var t=this;e.each(this[n],function(e,r){r[n](t)});return false})},u=function(t){var n=t.w,r=t.o,i=t.c;if(i.onShow(t)!==false){n[0]._jqmShown=true;if(i.modal){!h[0]&&f("bind");h.push(n)}else n.jqmAddClose(r);i.closeClass&&n.jqmAddClose(e("."+i.closeClass,n));i.toTop&&r&&n.before('<span id="jqmP'+i.ID+'"></span>').insertAfter(r);n.data("jqmv",r)}},a=function(t){var n=t.w,r=t.o,i=t.c;if(i.onHide(t)!==false){n[0]._jqmShown=false;if(i.modal){h.pop();!h[0]&&f("unbind")}i.toTop&&r&&e("#jqmP"+i.ID).after(n).remove()}},f=function(t){e(document)[t]("keypress keydown mousedown",l)},l=function(t){var n=e(t.target).data("jqm")||e(t.target).parents(".jqm-init:first").data("jqm"),r=h[h.length-1].data("jqm");if(n&&n.ID==r.ID)return true;return e.jqm.focusFunc(r)},c=0,h=[];e.jqm={params:{overlay:50,overlayClass:"jqmOverlay",closeClass:"jqmClose",trigger:".jqModal",ajax:false,target:false,ajaxText:"",modal:false,toTop:false,onShow:i,onHide:s,onLoad:false},focusFunc:function(t){e(":input:visible:first",t).focus();return false}}})(jQuery);

/*
 * Lazy Load - jQuery plugin for lazy loading images
 *
 * Copyright (c) 2007-2013 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.appelsiini.net/projects/lazyload
 *
 * Version:  1.9.3
 *
 */
!function(a,b,c,d){var e=a(b);a.fn.lazyload=function(f){function g(){var b=0;i.each(function(){var c=a(this);if(!j.skip_invisible||c.is(":visible"))if(a.abovethetop(this,j)||a.leftofbegin(this,j));else if(a.belowthefold(this,j)||a.rightoffold(this,j)){if(++b>j.failure_limit)return!1}else c.trigger("appear"),b=0})}var h,i=this,j={threshold:0,failure_limit:0,event:"scroll",effect:"show",container:b,data_attribute:"original",skip_invisible:!0,appear:null,load:null,placeholder:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC"};return f&&(d!==f.failurelimit&&(f.failure_limit=f.failurelimit,delete f.failurelimit),d!==f.effectspeed&&(f.effect_speed=f.effectspeed,delete f.effectspeed),a.extend(j,f)),h=j.container===d||j.container===b?e:a(j.container),0===j.event.indexOf("scroll")&&h.bind(j.event,function(){return g()}),this.each(function(){var b=this,c=a(b);b.loaded=!1,(c.attr("src")===d||c.attr("src")===!1)&&c.is("img")&&c.attr("src",j.placeholder),c.one("appear",function(){if(!this.loaded){if(j.appear){var d=i.length;j.appear.call(b,d,j)}a("<img />").bind("load",function(){var d=c.attr("data-"+j.data_attribute);c.hide(),c.is("img")?c.attr("src",d):c.css("background-image","url('"+d+"')"),c[j.effect](j.effect_speed),b.loaded=!0;var e=a.grep(i,function(a){return!a.loaded});if(i=a(e),j.load){var f=i.length;j.load.call(b,f,j)}}).attr("src",c.attr("data-"+j.data_attribute))}}),0!==j.event.indexOf("scroll")&&c.bind(j.event,function(){b.loaded||c.trigger("appear")})}),e.bind("resize",function(){g()}),/(?:iphone|ipod|ipad).*os 5/gi.test(navigator.appVersion)&&e.bind("pageshow",function(b){b.originalEvent&&b.originalEvent.persisted&&i.each(function(){a(this).trigger("appear")})}),a(c).ready(function(){g()}),this},a.belowthefold=function(c,f){var g;return g=f.container===d||f.container===b?(b.innerHeight?b.innerHeight:e.height())+e.scrollTop():a(f.container).offset().top+a(f.container).height(),g<=a(c).offset().top-f.threshold},a.rightoffold=function(c,f){var g;return g=f.container===d||f.container===b?e.width()+e.scrollLeft():a(f.container).offset().left+a(f.container).width(),g<=a(c).offset().left-f.threshold},a.abovethetop=function(c,f){var g;return g=f.container===d||f.container===b?e.scrollTop():a(f.container).offset().top,g>=a(c).offset().top+f.threshold+a(c).height()},a.leftofbegin=function(c,f){var g;return g=f.container===d||f.container===b?e.scrollLeft():a(f.container).offset().left,g>=a(c).offset().left+f.threshold+a(c).width()},a.inviewport=function(b,c){return!(a.rightoffold(b,c)||a.leftofbegin(b,c)||a.belowthefold(b,c)||a.abovethetop(b,c))},a.extend(a.expr[":"],{"below-the-fold":function(b){return a.belowthefold(b,{threshold:0})},"above-the-top":function(b){return!a.belowthefold(b,{threshold:0})},"right-of-screen":function(b){return a.rightoffold(b,{threshold:0})},"left-of-screen":function(b){return!a.rightoffold(b,{threshold:0})},"in-viewport":function(b){return a.inviewport(b,{threshold:0})},"above-the-fold":function(b){return!a.belowthefold(b,{threshold:0})},"right-of-fold":function(b){return a.rightoffold(b,{threshold:0})},"left-of-fold":function(b){return!a.rightoffold(b,{threshold:0})}})}(jQuery,window,document);

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]
shuffle = function(v) {
    for (var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
};

// Get object property by a dot-separated path
function getProperty(path, obj) {
    return [obj].concat(path.split('.')).reduce(function(prev, curr) {
        return prev && prev[curr];
    });
}

// Set object property by a dot-separated path
function setProperty(path, obj, val) {
    var parts = path.split('.'),
        last = parts.pop(),
        part;

    while (part = parts.shift()) {
        // rewrite property if it exists but is not an object
        obj = obj[part] = (obj[part] instanceof Object) ?
                          obj[part] : {};
    }

    obj[last] = val;
}

// Compatibility fix for pre-1.6.1 versions
// ff+gm: uneval for obj: ({a:5})
// gc+tm: uneval for obj: $1 = {"a":5};
function evalOrParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.log('Converting from old storage mode with spooky eval');
        return eval(str);
    }
}

// ----- Objects -----

function ICM_BaseFeature(config) {
    this.updateConfig(config);
}

ICM_BaseFeature.prototype.settings = {
    includes: [],
    excludes: []
};

ICM_BaseFeature.prototype.IsEnabled = function() {
    function testRegex(str) {
        return (new RegExp(str)).test(window.location.href);
    };

    return !this.settings.excludes.some(testRegex) &&
            this.settings.includes.some(testRegex);
};

// Add module options to the config;
// Keeps loaded values, excludes outdated options, adds new options
ICM_BaseFeature.prototype.updateConfig = function(config) {
    var module = this.settings.index,
        cur = {};

    $.each(this.settings.options, function(i, option) {
        var idx = option.name,
            oldValue = config.Get(module + '.' + idx),
            newValue = (oldValue !== undefined) ? oldValue : option.default;

        setProperty(idx, cur, newValue);
    });

    // save references to the global and module configs in a module
    this.config = config.cfg[module] = cur;
    this.globalConfig = config; // allows modules to use Save/Set/Get
};

// Config object constructor
function ICM_Config() {
    this.cfg = {
        script_config: { // script config
            version: "1.6.1",
            revision: 1610 // numerical representation of version number
        }
    };

    this.Init();
}

// Initialize stuff
ICM_Config.prototype.Init = function() {
    var oldcfg = evalOrParse(GM_getValue("icm_enhanced_cfg"));
    if (!oldcfg)
        return;

    var o = oldcfg.script_config,
        n = this.cfg.script_config,
        isUpdated = o.revision !== n.revision;
    // Rewrite script_config (no need to keep outdated values)
    oldcfg.script_config = n;
    this.cfg = oldcfg;

    if (isUpdated) {
        this.Save();
    }
}

// Save config
ICM_Config.prototype.Save = function() {
    GM_setValue( "icm_enhanced_cfg", JSON.stringify(this.cfg));
}

// Get config value
ICM_Config.prototype.Get = function( index ) {
    return getProperty(index, this.cfg);
}

// Set config value
ICM_Config.prototype.Set = function( index, value ) {
    setProperty(index, this.cfg, value);
}

// Sets false to true and vice versa
ICM_Config.prototype.Toggle = function( index ) {
    var val = this.Get(index),
        changeVal;

    if ( val === true || val === false ) {
        changeVal = !val;
    } else if ( val === "asc" || val === "desc" ) {
        changeVal = (val === "asc" ? "desc" : "asc");
    } else {
        return false; // Couldn't toggle a value
    }
    this.Set(index, changeVal);
    return true; // Value toggled
}

function ICM_ConfigWindow(Config) {
    this.config = Config;
    this.modules = [];
}

ICM_ConfigWindow.prototype.addModule = function(module) {
    if (!this.modules.some(function(m) {
        return m.title === module.title;
    })) {
        this.modules.push(module);
    }
}

ICM_ConfigWindow.prototype.loadOptions = function(idx) {
    $c = $("#module_settings");
    $c.html("");

    var m = this.modules[idx];

    var str = '<p>' + m.desc + '</p>';

    for (var i = 0; i < m.options.length; i++) {
        var opt = m.options[i],
            index = m.index + '.' + opt.name,
            optValue = this.config.Get(index); // always up to date

        if (opt.type === "checkbox") {
            str += '<p><input type="checkbox" data-cfg-index="' + index +
                   '"' + (optValue ? ' checked="checked"' : '') + '>' + opt.desc + '</p>';
        } else if (opt.type === "textinput") {
            str += '<p>' + opt.desc + ': <input type="text" data-cfg-index="' + index +
                   '" value="' + optValue + '"></p>';
        }
    }

    $c.append(str);
}

ICM_ConfigWindow.prototype.build = function() {
    // Sort module list by title
    this.modules.sort(function(a,b) { return a.title > b.title; });

    // Create and append a new item in the drop down menu under your username
    var cfgLink = '<li><a id="icm_enhanced_cfg" href="#" title="Configure iCheckMovies Enhanced script options">ICM Enhanced</a></li>';

    $("ul#profileOptions").append( cfgLink );

    // Custom CSS for jqmodal
    var customCSS = '.jqmWindow { display: none; position: absolute; font-family: verdana, arial, sans-serif; '
                  + 'background-color:#fff; color:#000; padding: 12px 30px;}'
                  + '.jqmOverlay { background-color:#000 }'
                  + 'div.icme_cfg_feature { margin-bottom: 15px; }'
                  + 'span.has_settings:hover { text-decoration: underline; }'
                  + 'div.icme_cfg_feature > div.icme_cfg_settings { display: none; margin-left: 22px; margin-top: 10px; }'
                  + 'span.icme_feature_title { font-weight: bold; }'
                  + 'input[type=text] { font-family: monospace }'
                  + '#module_settings { margin:10px 0; }'
                  + '#configSave { position: absolute; bottom:15px; left: 30px }'
                  + 'hr { border:0; height:1px; width:100%; background-color:#aaa; }';

    GM_addStyle(customCSS);

    var module_list = '<select id="modulelist" name="modulelist">';
    for (var i = 0; i < this.modules.length; ++i) {
        var m = this.modules[i];
        module_list += '<option value="' + i + '">' + m.title + '</option>';
    }
    module_list += '</select>';

    // HTML for the main jqmodal window
    var cfgMainHtml = '<div class="jqmWindow" id="cfgModal" style="top: 17%; left: 50%; margin-left: -400px; width: 800px; height:450px">'
                    + '<h3 style="color:#bbb">iCheckMovies Enhanced ' + this.config.cfg["script_config"].version + ' configuration</h3>'
                    + module_list
                    + '<hr><div id="module_settings"></div>'
                    + '<button id="configSave">Save settings</button>'
                    + '</div>';

    // append config window
    $("body").append( cfgMainHtml );

    var _t = this;

    $("div#cfgModal").on( "change", "input", function( e ) {
        var index = $(this).data("cfg-index");
        if ( !_t.config.Toggle(index) ) {
            _t.config.Set( index, $(this).val() );
        }

        $("button#configSave").prop("disabled", false);
    });

    $("div#cfgModal").on( "click", "button#configSave", function( e ) {
        _t.config.Save();

        $(this).prop("disabled", true);
    });

    $("#modulelist").on("change", function(e) {
        var idx = document.getElementById("modulelist").selectedIndex;
        _t.loadOptions(idx);
    });

    $("#modulelist").trigger("change");

    // initialize config window
    $("#cfgModal").jqm( { trigger: "a#icm_enhanced_cfg" } );
}

// Inherit methods from BaseFeature
ICM_RandomFilmLink.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_RandomFilmLink.prototype.constructor = ICM_RandomFilmLink;

function ICM_RandomFilmLink(config) {
    ICM_BaseFeature.call(this, config);

    this.random_nums = [];
}

// Creates an element and inserts it into the DOM
ICM_RandomFilmLink.prototype.Attach = function() {
    if ( this.config.enabled ) {
        var random_film = '<span style="float:right; margin-left: 15px"><a href="#" id="random_film">Help me pick a film!</a></span>';

        if ( $("div#list_container").length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + random_film + '</div>';

            $("div#topList").next("div").after( container );
        }
        else {
            $("div#list_container").append( random_film );
        }

        var that = this;

        $("div#list_container").on( "click", "a#random_film", function(e) {
            e.preventDefault();

            that.PickRandomFilm();
        });
    }
}

// Displays a random film on a list
ICM_RandomFilmLink.prototype.PickRandomFilm = function() {
    $unchecked = $("ol#itemListMovies > li.unchecked");

    if ( $unchecked.length > 0 ) {
        if ( this.config.unique ) {
            // Generate random numbers
            if ( this.random_nums.length === 0 ) {
                // Populate random_nums
                for ( var i = 0; i < $unchecked.length; i++ ) {
                    this.random_nums.push( i );
                }

                // Shuffle the results for randomness
                this.random_nums = shuffle( this.random_nums );
            }

            var rand_num = this.random_nums.pop();
        }
        else {
            var rand_num = Math.floor( Math.random() * $unchecked.length );
        }

        $("ol#itemListMovies > li").hide();

        $( $unchecked[ rand_num ] ).show();
    }
}

ICM_RandomFilmLink.prototype.settings = {
    title: "Random Film Link",
    desc: "Displays \"Help me pick a film\" link on individual lists",
    index: "random_film",
    includes: ["icheckmovies.com/lists/(.+)"],
    excludes: ["icheckmovies.com/lists/$"],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: true
    }, {
        name: "unique",
        desc: "Unique suggestions (shows each entry only once until every entry has been shown once)",
        type: "checkbox",
        default: true
    }]
};

// Inherit methods from BaseFeature
ICM_UpcomingAwardsList.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_UpcomingAwardsList.prototype.constructor = ICM_UpcomingAwardsList;

function ICM_UpcomingAwardsList(config) {
    ICM_BaseFeature.call(this, config);
}

ICM_UpcomingAwardsList.prototype.Attach = function() {
    if ( this.config.enabled && $("#itemListMovies").length ) {
        var total_items = parseInt($("li#listFilterMovies").text().match(/([0-9]+)/)[1]);
        var checks      = parseInt($("#topListMoviesCheckedCount").text().match(/\d+/));

        var statistics = '<span><b>Upcoming awards:</b>';

        var abs = this.config.show_absolute;
        var get_span = function(award, cutoff) {
            var num = Math.ceil(total_items * cutoff) - checks;
            if ((!abs) && (num <= 0))
                return '';
            return '<span style="margin-left: 30px">' + award + ': <b>' + num + '</b></span>';
        };

        statistics += get_span('Bronze', 0.5) + get_span('Silver', 0.75) +
                      get_span('Gold', 0.9) + get_span('Platinum', 1);

        if ( $("div#list_container").length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + statistics + '</div>';

            $("div#topList").next("div").after( container );
        }
        else {
            $("div#list_container").append( statistics );
        }
    }
}

ICM_UpcomingAwardsList.prototype.settings = {
    title: "Upcoming Awards (individual lists)",
    desc: "Displays upcoming awards on individual lists",
    index: "ua_list",
    includes: ["icheckmovies.com/lists/(.+)"],
    excludes: ["icheckmovies.com/list/$"],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: true
    }, {
        name: "show_absolute",
        desc: "Display negative values",
        type: "checkbox",
        default: true
    }]
};

// Inherit methods from BaseFeature
ICM_UpcomingAwardsOverview.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_UpcomingAwardsOverview.prototype.constructor = ICM_UpcomingAwardsOverview;

function ICM_UpcomingAwardsOverview(config) {
    ICM_BaseFeature.call(this, config);

    this.lists = [];
    this.hidden_lists = [];
}

ICM_UpcomingAwardsOverview.prototype.Attach = function() {
    if ( this.config.enabled ) {
        if ( this.config.autoload ) {
            this.LoadAwardData();
        }
        else {
            var load_link = '<p id="lad_container"><a id="load_award_data" href="#">Load upcoming awards for this user</a></p>';

            $("#listOrdering").before(load_link);

            var that = this;

            $("p#lad_container").on("click", "a#load_award_data", function(e) {
                e.preventDefault();

                $elem = $( e.target );
                $elem.remove();

                that.LoadAwardData();
            });
        }
    }
}

ICM_UpcomingAwardsOverview.prototype.LoadAwardData = function() {
    this.lists = [];
    this.hidden_lists = evalOrParse(GM_getValue("hidden_lists", "[]"));

    this.PopulateLists();
    this.SortLists();
    this.HTMLOut();
}

ICM_UpcomingAwardsOverview.prototype.PopulateLists = function() {
    $all_lists = $("ol#progressall, ol#itemListToplists").children("li");

    for ( var i = 0; i < $all_lists.length; i++ ) {
        $el = $($all_lists[i]);
        if (location.href.indexOf("progress") !== -1) {
            var count_arr   = $el.find("span.rank").html().split("<br>")[0];
            count_arr = count_arr.split(" / ");

            var checks      = parseInt( count_arr[0] );
            var total_items = parseInt( count_arr[1].split("#")[0] );

            $t = $el.find("h3 > a");

            var list_title  = $t.find("span").text();
            var list_url    = $t.attr("href");
        }
        else {
            var count_arr = $el.find("span.info > strong:first").text().split("/");

            var checks = parseInt(count_arr[0]);
            var total_items = parseInt(count_arr[1]);

            $t = $el.find("h2 > a.title");

            var list_title = $t.text();
            var list_url = $t.attr("href");
        }

        var award_types = [['Platinum', 1], ['Gold', 0.9], ['Silver', 0.75], ['Bronze', 0.5]];
        var that = this;
        $.each(award_types, function(i, val) {
            var award_checks = Math.ceil(total_items * val[1]) - checks;
            if (award_checks <= 0)
                return false; // exit loop; the order of array is important!
            that.lists.push({
                'award_checks': award_checks,
                'award_type': val[0],
                'list_title': list_title,
                'list_url': list_url
            });
        });
    } // End for loop
}

ICM_UpcomingAwardsOverview.prototype.SortLists = function() {
    // sort lists array by least required checks ASC,
	// then by awards where checks are equal ASC, then by list title ASC
    var award_order = { "Bronze": 0, "Silver": 1, "Gold": 2, "Platinum": 3 };
    this.lists.sort(function(a, b) {
        if (a.award_checks < b.award_checks)
            return -1;
        if (a.award_checks > b.award_checks)
            return 1;
        if (award_order[a.award_type] < award_order[b.award_type])
            return -1;
        if (award_order[a.award_type] > award_order[b.award_type])
            return 1;
        if (a.list_title < b.list_title)
            return -1;
        if (a.list_title > b.list_title)
            return 1;
        return 0;
    });
}

ICM_UpcomingAwardsOverview.prototype.HTMLOut = function() {
    var unhide_icon_data = "data:text/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjRuqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/26gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrEh546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8VgBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUPujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmHvwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaNZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzSCwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTkSuQmCC";
    var hide_icon_data = "data:text/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAADtSURBVHjajFC7DkFREJy9iXg0t+EHRKJDJSqRuIVaJT7AF+jR+xuNRiJyS8WlRaHWeOU+kBy7eyKhs8lkJrOzZ3OWzMAD15gxYhB+yzAm0ndez+eYMYLngdkIf2vpSYbCfsNkOx07n8kgWa1UpptNII5VR/M56Nyt6Qq33bbhQsHy6aR0WSyEyEmiCG6vR2ffB65X4HCwYC2e9CTjJGGok4/7Hcjl+ImLBWv1uCRDu3peV5eGQ2C5/P1zq4X9dGpXP+LYhmYz4HbDMQgUosWTnmQoKKf0htVKBZvtFsx6S9bm48ktaV3EXwd/CzAAVjt+gHT5me0AAAAASUVORK5CYII=";

    var list_table = '<table id="award_table"><thead><tr id="award_table_head"><th>Awards</th><th>Checks</th><th>List title</th><th>(Un)Hide</th></tr></head><tbody>';

    for ( var i = 0; i < this.lists.length; i++ ) {
        var el = this.lists[i];
        unhide_icon = '<img title="Unhide ' + $.trim(el.list_title) + '" alt="Unhide icon" src="' + unhide_icon_data + '">';
        hide_icon = '<img title="Hide ' + $.trim(el.list_title) + '" alt="Hide icon" src="' + hide_icon_data + '">';
        var is_hidden = (this.hidden_lists.indexOf(el.list_url) !== -1);

        list_table  += '<tr class="' + (is_hidden ? "hidden-list" : "") + '" data-award-type="' + el.award_type + '" data-list-url="' + el.list_url + '"><td style="width: 65px">'
                    + el.award_type + '</td><td style="width: 65px">' + el.award_checks
                    + '</td><td><div style="height: 28px; overflow: hidden"><a class="list-title" href="' + el.list_url + '">' + el.list_title + '</a></div></td>'
                    + '<td style="width: 70px"><a href="#" class="icm_hide_list">' + (is_hidden ? unhide_icon : hide_icon) + '</a></td></tr>';
    }

    list_table += '</tbody></table>';

    // build the html...
    var toggle_upcoming_link    = '<p id="ua_toggle_link_container" style="position: relative; left:0; top:0; width: 200px"><a id="toggle_upcoming_awards" href="#"><span class="_show" style="display: none">Show upcoming awards</span><span class="_hide">Hide upcoming awards</span></a></p>';
    var toggle_full_link        = '<a id="toggle_full_list" href="#"><span class="_show">Show full list</span><span class="_hide" style="display: none">Minimize full list</span></a>';
    var toggle_hidden_link      = '<a id="toggle_hidden_list" href="#">Show hidden</a>';

    var links   = '<p id="award_display_links" style="position: absolute; right: 0; top: 0; font-weight: bold">Display: <a id="display_all" href="#">All</a>, '
                + '<a id="display_bronze" href="#">Bronze</a>, <a id="display_silver" href="#">Silver</a>, <a id="display_gold" href="#">Gold</a>, '
                + '<a id="display_platinum" href="#">Platinum</a>, ' + toggle_full_link + ', ' + toggle_hidden_link + '</p>';

    var award_container = '<div id="award_container" class="container" style="position: relative; top: 0; width: 830px; height: 240px; overflow: scroll">' + list_table + '</div>';

    var all_html = '<div id="icm_award_html_container" style="z-index: 0; position: relative; margin-top: 0; margin-bottom: 20px">'
                + toggle_upcoming_link + links + award_container + '</div>';

    $("#icm_award_html_container, #ua_toggle_link_container").remove();

    if (location.href.indexOf("progress") !== -1)
        $("#listOrdering").before(all_html);
    else
        $("#itemContainer").before(all_html);

    $lists = $("#award_table");

    // hide hidden
    $lists.find(".hidden-list").hide();

    _this = this;

    $("a.icm_hide_list").on("click", function(e) {
        e.preventDefault();

        $this = $(this);
        $parent = $this.parent().parent();

        var list_title = $.trim($parent.find(".list-title").text());

        var ind = _this.hidden_lists.indexOf($parent.data("list-url"));
        if (ind === -1) {
            // hide list
            _this.hidden_lists.push($parent.data("list-url"));

            $("#award_table").find("tr").each(function(e) {
                $t = $(this);
                if ($t.data("list-url") === $parent.data("list-url")) {
                    $t.addClass("hidden-list").css("display", "none");
                    $t.find(".icm_hide_list").find("img").attr("src", unhide_icon_data).attr("alt", "Unhide Icon")
                    .attr("title", "Unhide " + list_title);
                }
            });
        }
        else {
            // unhide list
            _this.hidden_lists.splice(ind, 1);

            $("#award_table").find("tr.hidden-list").each(function(e) {
                $t = $(this);
                if ($t.data("list-url") === $parent.data("list-url")) {
                    $t.removeClass("hidden-list").css("display", "none");
                    $t.find(".icm_hide_list").find("img").attr("src", hide_icon_data).attr("alt", "Hide Icon")
                    .attr("title", "Hide " + list_title);
                }
            });
        }

        // save hidden lists
        GM_setValue("hidden_lists", JSON.stringify(_this.hidden_lists));
    });

    $("#toggle_hidden_list").on("click", function(e) {
        e.preventDefault();

        $lists.find("tr").hide();
        $lists.find("#award_table_head").show();
        $lists.find("tr.hidden-list").show();
    });

    $("#ua_toggle_link_container").on("click", "a#toggle_upcoming_awards span", function(e) {
        e.preventDefault();

        $("#award_display_links, #award_container").toggle();
        $("a#toggle_upcoming_awards span").toggle();
    });

    $("#award_display_links").on("click", "a#display_all", function(e) {
        e.preventDefault();

        $("table#award_table tr").hide();
        $("table#award_table tr").filter(function(index) {
            if ($(this).hasClass("hidden-list")) return false;
            return true;
        }).show();
    });

    $("#award_display_links").on("click", "a#display_bronze, a#display_silver, a#display_gold, a#display_platinum", function(e) {
        e.preventDefault();

        var award_type = $(this).attr("id").split('_')[1];
        $("table#award_table > tbody > tr").hide();
        $("table#award_table > tbody > tr").filter(function(index) {
            if ($(this).hasClass("hidden-list")) return false;
            if ($(this).data("award-type").toLowerCase() === award_type) return true;
            return false;
        }).show();
    });

    $("#award_display_links").on("click", "a#toggle_full_list span._show", function(e) {
        e.preventDefault();

        $("a#toggle_full_list span").toggle();
        $("div#award_container").css("height", "auto");
    });

    $("#award_display_links").on("click", "a#toggle_full_list span._hide", function(e) {
        e.preventDefault();

        $("a#toggle_full_list span").toggle();
        $("div#award_container").css("height", "240px");
    });
}

ICM_UpcomingAwardsOverview.prototype.settings = {
    title: "Upcoming Awards Overview",
    desc: "Displays upcoming awards on progress page",
    index: "ua",
    includes: ["/profiles/progress/",
               "/lists/favorited/",
               "/lists/watchlist/",
               "/lists/disliked/"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: true
    }, {
        name: "autoload",
        desc: "Autoload",
        type: "checkbox",
        default: true
    }]
};

// Inherit methods from BaseFeature
ICM_ListCustomColors.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_ListCustomColors.prototype.constructor = ICM_ListCustomColors;

function ICM_ListCustomColors(config) {
    ICM_BaseFeature.call(this, config);
}

ICM_ListCustomColors.prototype.Attach = function() {
    if ( this.config.enabled ) {
        var list_colors_css = "";

        var buildCSS = function(className, color) {
            if (!color.length)
                return;
            var sel = 'ol#itemListMovies li.' + className;
            list_colors_css += sel + ', ' + sel + ' ul.optionIconMenu { background-color: ' + color + ' !important; }';
        }

        buildCSS('favorite', this.config.colors.favorite);
        buildCSS('watch', this.config.colors.watchlist);
        buildCSS('hated', this.config.colors.disliked);

        GM_addStyle(list_colors_css);
    }
}

ICM_ListCustomColors.prototype.settings = {
    title: "Custom List Colors",
    desc: "Changes entry colors on lists to visually separate entries in your favorites/watchlist/dislikes",
    index: "list_colors",
    includes: ["icheckmovies.com/"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: true
    }, {
        name: "colors.favorite",
        desc: "Favorites",
        type: "textinput",
        default: "#ffdda9"
    }, {
        name: "colors.watchlist",
        desc: "Watchlist",
        type: "textinput",
        default: "#ffffd6"
    }, {
        name: "colors.disliked",
        desc: "Disliked",
        type: "textinput",
        default: "#ffad99"
    }]
};

// Inherit methods from BaseFeature
ICM_ListCrossCheck.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_ListCrossCheck.prototype.constructor = ICM_ListCrossCheck;

function ICM_ListCrossCheck(config) {
    ICM_BaseFeature.call(this, config);

    this.activated_once = false;
    this.Init();
}

/**
 * Initialize object variables
 */
ICM_ListCrossCheck.prototype.Init = function() {
    this.activated = false;

    // array of movie objects
    this.movies = [];

    // array of top list objects
    this.toplists = [];

    // number of total toplists
    this.num_toplists = 0;

    // cross-referencing in progress
    this.in_progress = false;

    // current top list's number that is checked
    this.sequence_number = 0;
}

ICM_ListCrossCheck.prototype.Attach = function() {
    if (this.config.enabled && $("#itemListToplists").length) {
        var actions = '<div id="crActions" style="margin-bottom: 18px"><button id="cfgListCCActivate">Activate CR</button></div>';

        $("#itemContainer").before(actions);

        var _t = this;

        $("div#crActions").on( "click", "button#cfgListCCActivate", function( e ) {
            $(this).prop("disabled", true);

            _t.CreateTab();

            _t.Activate();
        });

        var customCSS = '<style type="text/css">'
                      + 'ol#itemListToplists li.icme_listcc_selected, ol#itemListToplists li.icme_listcc_hover, '
                      + '.icme_listcc_selected .progress, .icme_listcc_hover .progress'
                      + ' { background-color: #cccccc !important; }'
                      + 'ol#itemListToplists li.icme_listcc_pending, .icme_listcc_pending .progress { background-color: #ffffb2 !important; }'
                      + '</style>';

        $("body").append(customCSS);
    }
}

ICM_ListCrossCheck.prototype.Activate = function() {
    this.Init();

    this.activated = true;

    var _t = this;

    $("button#cfgListCCActivate").after(' <button id="cfgListCCDeactivate">Deactivate</button>');

    $("div#crActions").on("click", "button#cfgListCCDeactivate", function(e) {
        _t.Deactivate();

        $("button#cfgListCCActivate").prop("disabled", false);
    });

    if ( !this.activated_once ) { // ff 3.6 compatibility (ff 3.6 fails to unbind the events in all possible ways)
        $("ol#itemListToplists li").on("click mouseover mouseout", function(e) {
            if ( _t.activated && !_t.in_progress ) { // ff 3.6 compatibility
                // these event actions must not work for cloned toplists under the selected tab
                if ( !$(this).hasClass("icme_listcc") ) {
                    if ( e.type == "mouseover" && !$(this).hasClass("icme_listcc_selected") ) {
                        $(this).addClass("icme_listcc_hover").find("span.percentage").hide();
                    }
                    else if ( e.type == "mouseout" && !$(this).hasClass("icme_listcc_selected") ) {
                        $(this).removeClass("icme_listcc_hover").find("span.percentage").show();
                    }
                    else if ( e.type == "click" ) {
                        $(this).removeClass("icme_listcc_hover");

                        if ( $(this).hasClass("icme_listcc_selected") ) {
                            $(this).removeClass("icme_listcc_selected").addClass("icme_listcc_hover");
                        }
                        else {
                            $(this).addClass("icme_listcc_selected");
                        }
                    }
                }

                return false; // ff 3.6 compatibility
            }
        });

        this.activated_once = true;
    }
}

ICM_ListCrossCheck.prototype.Deactivate = function() {
    var selected_toplists = $("li.icme_listcc_selected", "ul#topLists");

    // if there's still selected top lists, change them back to normal
    $(selected_toplists).removeClass("icme_listcc_selected").find("span.percentage").show();

    $("ol#itemListToplists").children("li").removeClass("icme_listcc_selected").removeClass("icme_listcc_hover");
    $("button#icme_listcc_check, button#cfgListCCDeactivate").remove();
    $("li#topListCategoryCCSelected").remove();
    $("button#cfgListCCActivate").prop("disabled", false);

    this.Init();
}

/**
 * Check through every selected top list
 */
ICM_ListCrossCheck.prototype.Check = function() {
    var toplist_cnt = $("ol#itemListToplists");

    // make selected top lists normal under the regular tabs
    toplist_cnt.children("li.icme_listcc_selected").removeClass("icme_listcc_selected").find("span.percentage").show();

    // get selected top lists
    jq_toplists = toplist_cnt.children("li.icme_listcc");

    this.num_toplists = jq_toplists.length;
    this.in_progress = true;

    // sort selected top lists in ascending order by number of unchecked films
    var get_unchecked = function(x) {
        var checks = $(x).find("span.info > strong:first").text().split("/");
        return checks[1] - checks[0];
    };
    jq_toplists.sort(function(a,b) {
        return get_unchecked(a) < get_unchecked(b) ? -1 : 1;
    });

    // make selected toplists highlighted under the selected tab
    jq_toplists.addClass("icme_listcc_selected").find("span.percentage").hide();

    this.toplists = jq_toplists.get();
    this.GetUncheckedFilms(this.toplists[this.sequence_number]);
}

/**
 * Get unchecked films from a top list
 *
 * @param list_elem jQuery object of the top list element
 */
ICM_ListCrossCheck.prototype.GetUncheckedFilms = function(list_elem) {
    var url = $(list_elem).find("a").attr("href");

    $(list_elem).addClass("icme_listcc_pending");

    var _t = this;

    $.get(url, function(response) {
        $(list_elem).removeClass("icme_listcc_selected icme_listcc_pending").find("span.percentage").show();

        // the site returns html with extra whitespace
        var unchecked = $($.parseHTML(response)).find("ol#itemListMovies").children("li.unchecked");

        _t.UpdateMovies( unchecked );
    });
}

/**
 * Update array of movies
 *
 * @param content jQuery object that consists of unchecked movies (<li> elements) on a top list page
 */
ICM_ListCrossCheck.prototype.UpdateMovies = function(content) {
    var movie_titles = content.find("h2");

    this.sequence_number += 1;

    // keeps track if at least one movie on the current top list is also found on all previous top lists
    // if the script is currently checking for movies found on all top lists. it's a major optimization
    // that halts the script if there's a top list with 0 matches especially early on and doesn't go on
    // to check all the rest of the lists wasting time
    var global_toplist_match = false;

    var show_perfect_matches = this.config.match_all;

    for (var i = 0; i < $(movie_titles).length; i++) {
        var found = false;
        var cur_title = $(movie_titles[i]);
        var movie = $.trim(cur_title.text());
        var movie_url = cur_title.find("a").attr("href");
        var movie_year = cur_title.next("span.info").children("a:first").text();

        for ( var j = 0; j < this.movies.length; j++ ) {
            // compare urls as they're guaranteed to be unique
            // in some cases movie title and release year are the same for different movies
            // which results in incorrect top list values
            if ( movie_url === this.movies[j].u ) {
                this.movies[j].c += 1;

                this.movies[j].jq.find(".rank").html(this.movies[j].c);
                found = true;

                global_toplist_match = true;

                break;
            }
        }

        // if a movie wasn't found on previous top lists
        if ( !found ) {
            // add it to the main movies array only if the script is not checking for matches on all top lists
            // OR if the script is checking for matches on all top lists, but this is just the first top list
            if ( !show_perfect_matches || ( show_perfect_matches && this.sequence_number == 1 ) ) {
                $item = $(content[i]);
                $item.find(".rank").html("0");

                var itemid = $item.attr("id");

                // check if owned
                var owned = evalOrParse(GM_getValue("owned_movies", "[]"));
                if (owned.indexOf(itemid) !== -1) {
                    $item.removeClass("notowned").addClass("owned");
                }

                // t = title, c = count, u = url, y = year
                this.movies.push( {t: movie, c: 1, u: movie_url, y: movie_year, jq: $item} );
            }
        }
    }

    var has_toplists_left = (this.sequence_number < this.toplists.length);

    // if finding movies on all selected top lists
    if ( show_perfect_matches ) {
        // if one or more movies was found on all selected top lists
        if ( global_toplist_match ) {
            // if not first top list, extract movies that have been found on all selected top lists
            if ( this.sequence_number > 1 ) {
                var cutoff = this.sequence_number;
                this.movies = $.grep(this.movies, function(el) {
                    return el.c === cutoff;
                });
            }

            // if there's still more top lists
            if ( has_toplists_left ) {
                this.GetUncheckedFilms(this.toplists[this.sequence_number]);
            }
            else {
                this.OutputMovies();
            }
        }
        else {
            // if finding movies on all selected top lists, but didn't find a single match,
            // continue if it was just the first top list
            if ( this.sequence_number == 1 && has_toplists_left ) {
                this.GetUncheckedFilms(this.toplists[this.sequence_number]);
            }
            else {
                this.movies = [];
                this.OutputMovies();
            }
        }
    }
    else {
        // if there's still more top lists
        if ( has_toplists_left ) {
            this.GetUncheckedFilms(this.toplists[this.sequence_number]);
        }
        else {
            this.OutputMovies();
        }
    }
}

ICM_ListCrossCheck.prototype.OutputMovies = function() {
    var show_perfect_matches = this.config.match_all;

    if ( !show_perfect_matches ) {
        var limit = this.config.match_min;

        if ( limit > 0 ) {
            this.movies = $.grep(this.movies, function(el) {
                return (el.c >= limit);
            });
        }
    }

    // Sort by checks DESC, then by year ASC, then by title ASC
    this.movies.sort(function(a,b) {
        if (a.c > b.c) return -1;
        if (a.c < b.c) return 1;
        if (a.y < b.y) return -1;
        if (a.y > b.y) return 1;
        if (a.t < b.t) return -1;
        if (a.t > b.t) return 1;
        return 0;
    });

    if ( this.movies.length > 0 ) {
        /*var movie_table = '<div id="icme_listcc_container" class="container" style="position: relative; width: 830px; height: 240px; overflow: scroll; margin-bottom: 10px">'
                        + '<table id="icme_listcc_movie_table"><tr><th style="width: 70px">Top lists</th><th>Movie title (total: ' + this.movies.length + ')</th></tr>';

        for ( var i = 0; i < this.movies.length; i++ ) {
            movie_table += '<tr><td style="float: right; padding-right: 20px">' + this.movies[i].c
                        + '</td><td><a href="' + this.movies[i].u + '">' + this.movies[i].t + ', ' + this.movies[i].y + '</a></td></tr>'
        }

        movie_table += '</table></div><ol id="itemListMovies" class="itemList listViewNormal"></ol>';*/

        var menu = '<ul>';
        for (var i = 0; i < this.toplists.length; ++i) {
            menu += '<li><b>' + $(this.toplists[i]).find("h2").text() + '</b></li>';
        }

        menu += '</ul><ul class="tabMenu tabMenuPush">'
                 + '<li class="topListMoviesFilter active">'
                 + '<a href="#" title="View all movies">All (' + this.movies.length + ')</a></li>'
                 + '<li class="listFilterExportCSV">'
                 + '<a href="#" title="Export all movies in CSV format">Export CSV</a></li>'
                 /*+ '<li class="topListMoviesFilter " id="listFilterChecked">'
                 + '<a title="View all your checked movies" href="#" id="linkListFilterChecked">Checked <span id="topListMoviesCheckedCount"></span></a></li>'
                 + '<li class="topListMoviesFilter " id="listFilterUnchecked">'
                 + '<a title="View all your unchecked movies" href="#" id="linkListFilterUnchecked">Unchecked <span id="topListMoviesUncheckedCount"></span></a></li>'*/
                 + '</ul>';

        // hide previous movie list
        $("#itemListMovies").removeAttr("id").hide();

        $("#itemContainer").after('<ol id="itemListMovies" class="itemList listViewNormal"></ol>');
        $("#itemContainer").after(menu);
        for (var i = 0; i < this.movies.length; ++i)
            $("#itemListMovies").append(this.movies[i].jq);

        $("#itemListMovies").children("li").show();

        $(".topListMoviesFilter a").on("click", function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            $this = $(this);
            $movielist = $this.parent().parent().next();

            if ($movielist.is(":visible")) {
                $this.parent().removeClass("active");
                $movielist.removeAttr("id").hide();
            }
            else {
                $this.parent().addClass("active");
                $movielist.attr("id", "itemListMovies").show();
            }
        });
        $(".listFilterExportCSV a").on("click", function(e) {
            e.preventDefault();

            var data = '"found_toplists","title","year","official_toplists","imdb"\n';
            $items = $("#itemListMovies").children("li");

            for (var i = 0; i < $items.length; ++i) {
                $item = $($items[i]);
                var found_toplists = $item.find(".rank").text();
                var title = $item.find("h2").text().trim().replace('"', '""');
                var year = $item.find(".info a:first").text();
                var toplists = parseInt($item.find(".info a:last").text());
                var imdburl = $item.find(".optionIMDB").attr("href");
                var line = '"' + found_toplists + '",'
                    + '"' + title + '",'
                    + '"' + year + '",'
                    + '"' + toplists + '",'
                    + '"' + imdburl + '"\n';

                data += line;
            }

            window.location.href = "data:text/csv;charset=utf-8," + encodeURIComponent(data);
        });
    }
    else {
        $("#icme-crossref-notfound").remove();
        $("#itemContainer").after('<div id="icme-crossref-notfound">Found 0 movies.</div>');
    }

    this.Deactivate();
}

ICM_ListCrossCheck.prototype.CreateTab = function() {
    if ($("#listFilterCRSelected").length) {
        return;
    }

    var tab = '<li id="listFilterCRSelected"><a href="#" class="icme_listcc">Cross-reference</a><strong style="display: none">Cross-reference</strong></li>';

    $tlfilter = $("ul.tabMenu", "div#itemContainer");
    $tlfilter.append( tab );

    var _t = this;

    // Modified from ICM source. Make the tab work.
    $("#listFilterCRSelected a").on("click", function () {
        var a = $(this).attr("class"),
            b = $(this).closest("li");
        $(".tabMenu").find("li").each(function () {
            $(this).removeClass("active");
        });
        b.addClass("active");

        if ( a == "icme_listcc" && !_t.in_progress ) {
            $top_list_ul = $("ol#itemListToplists");
            $top_list_ul.children("li.icme_listcc").remove();

            $top_lists = $top_list_ul.children("li.icme_listcc_selected").clone();

            //$top_list_ul.children("li.icme_listcc_selected").removeClass("icme_listcc_selected");

            $top_lists.removeClass("imdb critics prizes website institute misc icme_listcc_selected").addClass("icme_listcc").find("span.percentage").show();

            $top_list_ul.append( $top_lists );

            if ( $("li.icme_listcc", "ol#itemListToplists").length >= 2 && $("button#icme_listcc_check").length == 0 ) {
                var btn = '<button id="icme_listcc_check">Cross-reference</button>';

                $("div#crActions").append(btn);

                $("button#icme_listcc_check").on("click", function(e) {
                    $(this).prop("disabled", true);

                    _t.Check();
                });

                // Make the current tab work if we want to return to it
                $("ul.tabMenu").children("li").each(function() {
                    if (!($(this).children("a").length)) {
                        $clicked = $(this);
                        $clicked.on("click", function(e) {
                            $("ol#itemListToplists").children("li").show();
                            $("ul.tabMenu").children("li").removeClass("active");
                            $clicked.addClass("active");
                            $("ol#itemListToplists").children("li.icme_listcc").remove();
                        });
                    }
                });
            }
            else if ( $("li.icme_listcc", "ol#itemListToplists").length < 2 && $("button#icme_listcc_check").length == 1 ) {
                $("button#icme_listcc_check").remove();
            }
        }

        b = $("ol#itemListToplists");
        b.find("li").hide();
        b.find("li." + a).show();
        a == "imdb" ? b.addClass("doubleList") : b.removeClass("doubleList");

        return false
    });
}

ICM_ListCrossCheck.prototype.settings = {
    title: "List Cross-reference",
    desc: "Cross-reference lists to find what films they share",
    index: "list_cross_ref",
    includes: ["icheckmovies.com/lists/"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: false
    }, {
        name: "match_all",
        desc: "Find films that appear on all selected lists",
        type: "checkbox",
        default: true
    }, {
        name: "match_min",
        desc: "If the above checkbox is unchecked, find films that appear on this many lists",
        type: "textinput",
        default: 2
    }]
};

// Inherit methods from BaseFeature
ICM_HideTags.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_HideTags.prototype.constructor = ICM_HideTags;

function ICM_HideTags(config) {
    ICM_BaseFeature.call(this, config);
}

ICM_HideTags.prototype.Attach = function() {
    if (this.config.enabled) {
        GM_addStyle("ol#itemListToplists li .info:last-child, ol#itemListMovies li .tagList { display: none !important; }");

        if (this.config.show_hover) {
            GM_addStyle("ol#itemListToplists li:hover .info:last-child, ol#itemListMovies li:hover .tagList { display: block !important; }");
        }
    }
}

ICM_HideTags.prototype.settings = {
    title: "Hide tags",
    desc: "Hides tags on individual lists",
    index: "hide_tags",
    includes: ["icheckmovies.com/"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: false
    }, {
        name: "show_hover",
        desc: "Show tags when moving the cursor over a movie",
        type: "checkbox",
        default: false
    }]
};

// Inherit methods from BaseFeature
ICM_WatchlistTab.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_WatchlistTab.prototype.constructor = ICM_WatchlistTab;

function ICM_WatchlistTab(config) {
    ICM_BaseFeature.call(this, config);
}

ICM_WatchlistTab.prototype.Attach = function() {
    if (!this.config.enabled) {
        return;
    }

    $movies = $("#itemListMovies");
    if ($movies.length === 0) {
        return;
    }

    var watch_count = $movies.children("li.watch").length;
    var tabHtml = "<li id=\"listFilterWatch\" class=\"topListMoviesFilter\">"
    + "<a id=\"linkListFilterWatch\" href=\"#\" title=\"View all your watchlist movies\">Watchlist "
    + "<span id=\"topListMoviesWatchCount\">(" + watch_count + ")</span></a>"
    + "</li>";

    $("#listFilterUnchecked").after(tabHtml);

    $first = $("#listFilterMovies").find("a");
    $first.text($first.text().replace(" movies", ""));

    // move the order by and views to filter box
    if ($("#orderByAndView").length === 0) {
        $("#topList").append('<div id="orderByAndView" style="z-index:200;position:absolute;top:30px;right:0;width:300px;height:20px"> </div>');
        $("#listOrdering").detach().appendTo("#orderByAndView");
        $("#listViewswitch").detach().appendTo("#orderByAndView");
    }

    $("#linkListFilterWatch").on("click", function(e) {
        $movies = $("#itemListMovies");
        $movies.children("li").hide();
        $movies.children("li.watch").show();

        $(".tabMenu", "#itemContainer").children("li").removeClass("active");
        $(this).parent("li").addClass("active");

        return false;
    });
}

ICM_WatchlistTab.prototype.settings = {
    title: "Watchlist tab",
    desc: "Creates a tab on lists that shows watchlist entries.",
    index: "watchlist_tab",
    includes: ["icheckmovies.com/lists"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: false
    }]
};

// Inherit methods from BaseFeature
ICM_Owned.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_Owned.prototype.constructor = ICM_Owned;

function ICM_Owned(config) {
    ICM_BaseFeature.call(this, config);
}

ICM_Owned.prototype.Attach = function() {
    if (!this.config.enabled) {
        return;
    }

    $movielist = $("#itemListMovies");
    if ($movielist.length === 0) {
        // Check if movie page
        $markOwned = $(".optionMarkOwned");
        if ($markOwned.length === 0) {
            return;
        }

        if (this.config.free_account) {
            var owned = evalOrParse(GM_getValue("owned_movies", "[]"));
            $movielink = $markOwned.parent().parent().prev("a");

            var movie_id = $movielink.attr("id");
            movie_id = movie_id.replace("check", "movie");
            if (owned.indexOf(movie_id) !== -1) {
                $movie = $movielink.parent();
                $movie.removeClass("notowned").addClass("owned");
            }

            $(".optionMarkOwned").on("click", function(e) {
                e.preventDefault();
                owned = evalOrParse(GM_getValue("owned_movies", "[]"));

                // if movie is found in cached owned movies
                $parent = $(this).parent().parent().prev("a");
                var movie_id = $parent.attr("id");
                movie_id = movie_id.replace("check", "movie");
                console.log(movie_id);
                $movie = $(this).parent().parent().parent();
                var ind = owned.indexOf(movie_id);

                // if found movie in the owned array...
                if (ind !== -1) {
                    console.log("found");
                    $movie.removeClass("owned").addClass("notowned");
                    owned.splice(ind, 1);
                }
                else {
                    console.log("not found");
                    $movie.removeClass("notowned").addClass("owned");
                    owned.push(movie_id);
                }

                GM_setValue("owned_movies", JSON.stringify(owned));
            });
        }

    }
    else {
    if (this.config.free_account) {
        var owned = evalOrParse(GM_getValue("owned_movies", "[]"));

        $movies = $movielist.children("li");

        // mark owned movies as owned
        for (var i = 0; i < $movies.length; i++) {
            $el = $($movies[i]);
            var movie_id = $el.attr("id");
            var ind = owned.indexOf(movie_id);

            // if movie id is found in cached owned movies
            if (ind !== -1) {
                $el.removeClass("notowned").addClass("owned");
            }

            // remove paid feature crap
            $($movies[i]).find(".optionIconMenu").find("li").find("a").removeClass("paidFeature");
        }

        $(".optionMarkOwned").on("click", function(e) {
            owned = evalOrParse(GM_getValue("owned_movies", "[]"));

            // if movie is found in cached owned movies
            $parent = $(this).parent().parent().parent();
            var movie_id = $parent.attr("id");
            var ind = owned.indexOf(movie_id);

            // if found movie in the owned array...
            if (ind !== -1) {
                $parent.removeClass("owned").addClass("notowned");
                owned.splice(ind, 1);
            }
            else {
                $parent.removeClass("notowned").addClass("owned");
                owned.push(movie_id);
            }

            var owned_count = $movielist.children("li.owned").length;
            $("#topListMoviesOwnedCount").text("(" + owned_count + ")");

            GM_setValue("owned_movies", JSON.stringify(owned));

            return false;
        });
    }
    }

    var owned_count = $movielist.children("li.owned").length;
    var tabHtml = "<li id=\"listFilterOwned\" class=\"topListMoviesFilter\">"
    + "<a id=\"linkListFilterOwned\" href=\"#\" title=\"View all your owned movies\">Owned "
    + "<span id=\"topListMoviesOwnedCount\">(" + owned_count + ")</span></a>"
    + "</li>";

    $("#listFilterNew").before(tabHtml);

    $first = $("#listFilterMovies").find("a");
    $first.text($first.text().replace(" movies", ""));

    // move the order by and views to filter box
    var isWatchlist = new Boolean($("#topList").length);
    if ($("#orderByAndView").length === 0 && !isWatchlist) {
        $("#topList").append('<div id="orderByAndView" style="z-index:200;position:absolute;top:30px;right:0;width:300px;height:20px"> </div>');
        $("#listOrdering").detach().appendTo("#orderByAndView");
        $("#listViewswitch").detach().appendTo("#orderByAndView");
    }

    $("#linkListFilterOwned, #listFilterOwned").on("click", function(e) {
        $movielist = $("#itemListMovies");
        $movielist.children("li").hide();
        $movielist.children("li.owned").show();

        $(".tabMenu", "#itemContainer").children("li").removeClass("active");
        $(this).parent("li").addClass("active");

        return false;
    });

    $("#listFilterWatchlist").on("click", function(e) {
        $movielist = $("#itemListMovies");
        $movielist.children("li").hide();
        $movielist.children("li.watch").show();
    });
}

ICM_Owned.prototype.settings = {
    title: "Owned tab",
    desc: "Creates a tab on lists that shows owned entries. Emulates the paid feature",
    index: "owned_tab",
    includes: ["icheckmovies.com/"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: false
    }, {
        name: "free_account",
        desc: "I have a free account (must uncheck if you have a paid account)",
        type: "checkbox",
        default: false
    }]
};

// Inherit methods from BaseFeature
ICM_LargeList.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_LargeList.prototype.constructor = ICM_LargeList;

function ICM_LargeList(config) {
    ICM_BaseFeature.call(this, config);

    this.loaded = false;
}

ICM_LargeList.prototype.Attach = function() {
    if (!this.config.enabled) {
        return;
    }

    if (this.config.autoload) {
        this.load();
    }
    else {
        // create link
        var link = '<span style="float: right; margin-left: 15px"><a id="icme_large_posters" href="#">Large posters</a></span>';

        if ( $("div#list_container").length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + link + '</div>';

            $("div#topList").next("div").after( container );
        }
        else {
            if ($("#list_container").find("p").length === 1) {
                $("#list_container p:first").append("<span> &mdash; </span>" + link);
            }
            else {
                $("div#list_container").append( link );
            }
        }

        var _t = this;
        $("#icme_large_posters").on("click", function(e) {
            e.preventDefault();

            _t.load();
        });
    }
}

ICM_LargeList.prototype.load = function() {
    if (this.loaded) {
        return;
    }

    this.loaded = true;

    var style = "#itemListMovies > .listItem { float:left !important; height: 330px !important; width: 255px !important; }"
        + ".listItem .listImage { float:none !important; width: 230px !important; height: 305px !important; left:-18px !important; top:-18px !important; margin:0!important }"
        + ".listImage a {width:100% !important; height:100% !important; background: url(\"/images/dvdCover.png\") no-repeat scroll center center transparent !important;}"
        + ".listImage .coverImage { width:190px !important; height:258px !important; top:21px !important; left: 19px !important; right:auto !important; }"
        + ".listItem .rank { top: 15px !important; position:absolute !important; height:auto !important; width:65px !important; right:0 !important; margin:0 !important; font-size:30px !important }"
        + ".listItem .rank .positiondifference span { font-size: 12px !important }"
        + ".listItem h2 { z-index:11 !important; font-size:14px !important; width:100% !important; margin:-30px 0 0 0 !important; }"
        + ".listItem .info { font-size:12px !important; width:100% !important; height:auto !important; line-height:16px !important; margin-top:4px !important }"
        + ".checkbox { top:85px !important; right:12px !important }"
        //+ ".checkbox { display:none !important }"
        + "#itemListMovies .optionIconMenu { top:120px !important; right:20px !important }"
        + "#itemListMovies .optionIconMenu li { display: block !important }"
        + "#itemListMovies .optionIconMenuCheckbox { right:20px !important }";
        //+ ".optionIconMenu { display:none !important }";

    GM_addStyle(style);

    $c = $("#itemListMovies").find("div.coverImage").hide();
    for (var i = 0; i < $c.length; i++) {
        var cururl = $c[i].style.backgroundImage;
        if (cururl.substr(4,1) !== "h") {
            cururl = cururl.slice(5,-2).replace("small", "medium").replace("Small", "Medium");
        }
        else { // chrome handles urls differently
            cururl = cururl.slice(4,-1).replace("small", "medium").replace("Small", "Medium");
        }
        var img = document.createElement("img");
        img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY5j8rA8ABBcCCCnPKCcAAAAASUVORK5CYII=";
        img.className = "coverImage";
        img.setAttribute("data-original", cururl);
        $c[i].parentNode.appendChild(img);
    }

    $("img.coverImage").lazyload({ threshold : 200 });
}

ICM_LargeList.prototype.settings = {
    title: "Large Posters",
    desc: "Display large posters on individual lists (large posters are lazy loaded)",
    index: "large_lists",
    includes: ["icheckmovies\.com/lists/(.+)/(.*)"],
    excludes: ["icheckmovies\.com/lists/favorited",
               "icheckmovies\.com/lists/disliked",
               "icheckmovies\.com/lists/watchlist"],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: true
    }, {
        name: "autoload",
        desc: "Autoload",
        type: "checkbox",
        default: false
    }]
};

// Inherit methods from BaseFeature
ICM_ListOverviewSort.prototype = Object.create(ICM_BaseFeature.prototype);
ICM_ListOverviewSort.prototype.constructor = ICM_ListOverviewSort;

function ICM_ListOverviewSort(config) {
    ICM_BaseFeature.call(this, config);

    this.sections = ["imdb", "country", "critics", "director",
                     "website", "institute", "misc", "all", "award"];
}

ICM_ListOverviewSort.prototype.Attach = function() {
    if (!this.config.enabled) {
        return;
    }

    if ( this.config.single_col ) {
        GM_addStyle('.itemList .listItem.listItemProgress { float: none !important; }');
    }

    if ( this.config.autoload ) {
        for ( var i = 0; i < this.sections.length; i++ ) {
            var order = this.config.order === true ? "desc" : "asc";
            this.Sort( order, this.sections[i] );
        }
    }
}

ICM_ListOverviewSort.prototype.Sort = function(order, section) {
    $toplist_list = $("#progress" + section);
    $toplist_items = $toplist_list.children("li").get();

    var lookup_table = [];

    // construct a lookup table for percentages
    for ( var i = 0; i < $toplist_items.length; i++ ) {
        var tmp = $( $toplist_items[i] ).find("span.progress").css("width").replace("px", "");

        lookup_table.push( parseInt( tmp ) );
    }

    var lut_len = lookup_table.length;

    for ( var i = 0; i < lut_len; i++ ) {
        var tmp = i;
        var smallest = i;

        // find the smallest value...
        while ( tmp < lut_len ) {
            if ( order === "asc" && lookup_table[ tmp ] < lookup_table[ smallest ] ) {
                smallest = tmp;
            }
            else if ( order === "desc" && lookup_table[ tmp ] > lookup_table[ smallest ] ) {
                smallest = tmp;
            }

            tmp++;
        }

        // and swap with current position i
        var tmp_list = $toplist_items[i];
        $toplist_items[i] = $toplist_items[smallest];
        $toplist_items[smallest] = tmp_list;

        var tmp_val = lookup_table[i];
        lookup_table[i] = lookup_table[smallest];
        lookup_table[smallest] = tmp_val;
    }

    if ( this.config.single_col || this.config.icebergs ) {
        for ( var i = 0; i < lut_len; i++ ) {
            $toplist_list.append( $toplist_items[i] );
        }
    }
    else {
        // exclude last entry if odd numbered
        half_point = Math.ceil( lookup_table.length / 2 );

        // place the elements in such order that lowest / highest appear on the left side and the opposite on the right side
        for ( var i = 0, first_half = 0, second_half = half_point; i < lut_len; i++ ) {
            if ( i % 2 === 0 ) {
                $toplist_list.append( $( $toplist_items[first_half] ).removeClass("right").addClass("left") );
                first_half++;
            }
            else {
                $toplist_list.append( $( $toplist_items[second_half] ).removeClass("left").addClass("right") );
                second_half++;
            }
        }
    }
}

ICM_ListOverviewSort.prototype.settings = {
    title: "Sort Progress Page",
    desc: "Sort lists on progress page by completion rate",
    index: "toplists_sort",
    includes: ["icheckmovies.com/profiles/progress"],
    excludes: [],
    options: [{
        name: "enabled",
        desc: "Enabled",
        type: "checkbox",
        default: false
    }, {
        name: "autoload",
        desc: "Autoload",
        type: "checkbox",
        default: true
    }, {
        name: "order",
        desc: "Ascending",
        type: "checkbox",
        default: true
    }, {
        name: "single_col",
        desc: "Single column",
        type: "checkbox",
        default: false
    }, {
        name: "icebergs",
        desc: "Keep most completed on top in both columns (requires 'Single column' is unchecked)",
        type: "checkbox",
        default: false
    }]
};

/**
 * Main application
 * Register and load modules
 */
function ICM_Enhanced(scriptConfig) {
    this.modules = [];
    this.configWindow = new ICM_ConfigWindow(scriptConfig);
}

ICM_Enhanced.prototype.register = function(module) {
    this.modules.push(module);
    this.configWindow.addModule(module.settings);
}

ICM_Enhanced.prototype.load = function() {
    $.each(this.modules, function(i, m) {
        if (m.IsEnabled()) {
            console.log('Attaching ' + m.constructor.name);
            m.Attach();
        }
    });

    this.configWindow.build();
}

var config = new ICM_Config();

var useModules = [
    ICM_RandomFilmLink,
    ICM_HideTags,
    ICM_UpcomingAwardsList,
    ICM_ListCustomColors,
    ICM_UpcomingAwardsOverview,
    ICM_ListCrossCheck,
    ICM_WatchlistTab,
    ICM_Owned,
    ICM_LargeList,
    ICM_ListOverviewSort
];

var app = new ICM_Enhanced(config);
$.each(useModules, function(i, Obj) {
    app.register(new Obj(config));
});
app.load();
