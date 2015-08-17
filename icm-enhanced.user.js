// ==UserScript==
// @name           iCheckMovies Enhanced
// @namespace      iCheckMovies
// @description    Adds new features to enhance the iCheckMovies user experience
// @version        1.7.6.2
// @include        http://icheckmovies.com*
// @include        http://www.icheckmovies.com*
// @include        https://icheckmovies.com*
// @include        https://www.icheckmovies.com*
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/jquery_lazyload/1.9.5/jquery.lazyload.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/jqModal/1.3.0/jqModal.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.7.1/spectrum.min.js
// @resource       spectrumCss https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.7.1/spectrum.min.css
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_addStyle
// @grant          GM_getResourceText
// ==/UserScript==

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var gmSetValue = GM_setValue,
    gmGetValue = GM_getValue,
    gmAddStyle = GM_addStyle,
    gmGetResourceText = GM_getResourceText;
// jscs:enable requireCamelCaseOrUpperCaseIdentifiers

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]
var shuffle = function(v) {
    /* jshint nocomma: false, noempty: false */
    for (var j, x, i = v.length;
        i > 1;
        j = Math.floor(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x) {
    }
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

    /* jshint boss: true */
    while (part = parts.shift()) { // assignment
        // rewrite property if it exists but is not an object
        obj = obj[part] = obj[part] instanceof Object ?
                          obj[part] : {};
    }

    obj[last] = val;
}

// Compatibility fix for pre-1.6.1 versions
// ff+gm: uneval for obj: ({a:5})
// gc+tm: uneval for obj: $1 = {"a":5};
function evalOrParse(str) {
    /* jshint evil: true */
    try {
        return JSON.parse(str);
    } catch (e) {
        console.log('Converting from old storage mode with spooky eval');
        return eval(str);
    }
}

// ----- Objects -----

function BaseFeature(config) {
    this.updateConfig(config);
}

BaseFeature.prototype.settings = {
    includes: [],
    excludes: []
};

BaseFeature.prototype.isEnabled = function() {
    function testRegex(str) {
        return (new RegExp(str)).test(window.location.href);
    }

    return !this.settings.excludes.some(testRegex) &&
            this.settings.includes.some(testRegex);
};

// Add module options to the config;
// Keeps loaded values, excludes outdated options, adds new options
BaseFeature.prototype.updateConfig = function(config) {
    var module = this.settings.index,
        cur = {};

    $.each(this.settings.options, function(i, option) {
        var idx = option.name,
            oldValue = config.get(module + '.' + idx),
            newValue = oldValue !== undefined ? oldValue : option.default;

        setProperty(idx, cur, newValue);
    });

    // save references to the global and module configs in a module
    this.config = config.cfg[module] = cur;
    this.globalConfig = config; // allows modules to use Save/Set/Get
};

// Config object constructor
function Config() {
    this.cfg = {
        script_config: { // script config
            version: '1.7.6.2',
            revision: 1762 // numerical representation of version number
        }
    };

    this.init();
}

// Initialize stuff
Config.prototype.init = function() {
    var oldcfg = evalOrParse(gmGetValue('icm_enhanced_cfg'));
    if (!oldcfg) {
        return;
    }

    var o = oldcfg.script_config,
        n = this.cfg.script_config,
        isUpdated = o.revision !== n.revision;
    // Rewrite script_config (no need to keep outdated values)
    oldcfg.script_config = n;
    this.cfg = oldcfg;

    if (isUpdated) {
        this.save();
    }
};

// Save config
Config.prototype.save = function() {
    // console.log("Saving config", this.cfg); // debug
    gmSetValue( 'icm_enhanced_cfg', JSON.stringify(this.cfg));
};

// Get config value
Config.prototype.get = function( index ) {
    return getProperty(index, this.cfg);
};

// Set config value
Config.prototype.set = function( index, value ) {
    setProperty(index, this.cfg, value);
};

// Sets false to true and vice versa
Config.prototype.toggle = function( index ) {
    var val = this.get(index),
        changeVal;

    if ( val === true || val === false ) {
        changeVal = !val;
    } else if ( val === 'asc' || val === 'desc' ) {
        changeVal = val === 'asc' ? 'desc' : 'asc';
    } else {
        return false; // Couldn't toggle a value
    }
    this.set(index, changeVal);
    return true; // Value toggled
};

function ConfigWindow(Config) {
    this.config = Config;
    this.modules = [];
}

ConfigWindow.prototype.addModule = function(module) {
    if (!this.modules.some(function(m) {
        return m.title === module.title;
    })) {
        this.modules.push(module);
    }
};

ConfigWindow.prototype.loadOptions = function(idx) {
    var m = this.modules[idx],
        str = '<p>' + m.desc + '</p>',
        needsExtraInit = false;

    for (var opt of m.options) {
        var index = m.index + '.' + opt.name,
            optValue = this.config.get(index), // always up to date
            indexAttr = ' data-cfg-index="' + index + '"';

        if (opt.type === 'checkbox') {
            str += '<p><input type="checkbox"' + indexAttr +
                   (optValue ? ' checked="checked"' : '') + ' title="default: ' +
                   (opt.default ? 'yes' : 'no') + '">' + opt.desc + '</p>';
        } else if (opt.type === 'textinput') {
            str += '<p>' + opt.desc + ': <input type="text"' + indexAttr +
                   ' value="' + optValue + '" title="default: ' + opt.default + '"></p>';
        } else if (opt.type === 'textarea') {
            // optValue can be a string (until a module parses it) or an array (after)
            if ($.isArray(optValue)) {
                optValue = optValue.join('\n');
            }
            str += '<p><span style="vertical-align: top; margin-right: 5px">' + opt.desc +
                   ':</span><textarea rows="4" cols="70"' + indexAttr +
                   '>' + optValue + '</textarea></p>';
        } else if (opt.type === 'textinputcolor') {
            str += '<p>' + opt.desc + ': <input type="text" class="colorpickertext"' +
                   indexAttr + ' value="' + optValue + '" title="default: ' +
                   opt.default + '">' + ' <input type="text" class="colorpicker"></p>';
            needsExtraInit = true;
        }
    }

    $('#module_settings').html(str);

    if (needsExtraInit) {
        this.initColorPickers();
    }
};

ConfigWindow.prototype.initColorPickers = function() {
    $('.colorpicker').each(function() {
        var $t = $(this);
        $t.spectrum({
            color: $t.prev().val(),
            change: function(color) {
                var $prev = $t.prev();
                $prev.val(color.toHexString());
                $prev.trigger('change');
            }
        });
    });
    $('.colorpickertext').on('change input paste', function() {
        $(this).next().spectrum('set', $(this).val());
    });
};

ConfigWindow.prototype.build = function() {
    // Sort module list by title
    this.modules.sort(function(a, b) { return a.title > b.title ? 1 : -1; });

    // Create and append a new item in the drop down menu under your username
    var cfgLink = '<li><a id="icm_enhanced_cfg" href="#" title="Configure iCheckMovies Enhanced script options">ICM Enhanced</a></li>';

    $('ul#profileOptions').append( cfgLink );

    // Custom CSS for jqmodal
    var customCSS =
        '.jqmWindow { display: none; position: absolute; font-family: verdana, arial, sans-serif; ' +
        'background-color:#fff; color:#000; padding: 12px 30px;}' +
        '.jqmOverlay { background-color:#000 }' +
        'div.icme_cfg_feature { margin-bottom: 15px; }' +
        'span.has_settings:hover { text-decoration: underline; }' +
        'div.icme_cfg_feature > div.icme_cfg_settings { display: none; margin-left: 22px; margin-top: 10px; }' +
        'span.icme_feature_title { font-weight: bold; }' +
        'input[type=text] { font-family: monospace }' +
        '#module_settings { margin:10px 0; }' +
        '#module_settings > p { margin-bottom: 0.5em; }' +
        '#configSave { position: absolute; bottom:15px; left: 30px }' +
        'hr { border:0; height:1px; width:100%; background-color:#aaa; }';

    gmAddStyle(customCSS);

    var moduleList = '<select id="modulelist" name="modulelist">';
    for (var i = 0; i < this.modules.length; ++i) {
        var m = this.modules[i];
        moduleList += '<option value="' + i + '">' + m.title + '</option>';
    }
    moduleList += '</select>';

    // HTML for the main jqmodal window
    var cfgMainHtml =
        '<div class="jqmWindow" id="cfgModal" style="top: 17%; left: 50%; margin-left: -400px; width: 800px; height:450px">' +
        '<h3 style="color:#bbb">iCheckMovies Enhanced ' + this.config.cfg.script_config.version + ' configuration</h3>' +
        moduleList +
        '<hr><div id="module_settings"></div>' +
        '<button id="configSave">Save settings</button>' +
        '</div>';

    // append config window
    $('body').append( cfgMainHtml );

    var _t = this;

    $('div#cfgModal').on( 'change', 'input, textarea', function() {
        var index = $(this).data('cfg-index');
        if (index === undefined) {
            return;
        }

        if ( !_t.config.toggle(index) ) {
            _t.config.set( index, $(this).val() );
        }

        $('button#configSave').prop('disabled', false);
    });

    $('div#cfgModal').on( 'click', 'button#configSave', function() {
        _t.config.save();

        $(this).prop('disabled', true);
    });

    $('#modulelist').on('change', function() {
        var idx = document.getElementById('modulelist').selectedIndex;
        _t.loadOptions(idx);
    });

    $('#modulelist').trigger('change');

    // initialize config window
    $('#cfgModal').jqm( { trigger: 'a#icm_enhanced_cfg' } );

    // Initialize spectrum plugin
    gmAddStyle(gmGetResourceText('spectrumCss'));
};

// Inherit methods from BaseFeature
RandomFilmLink.prototype = Object.create(BaseFeature.prototype);
RandomFilmLink.prototype.constructor = RandomFilmLink;

function RandomFilmLink(config) {
    BaseFeature.call(this, config);

    this.randomNums = [];
}

// Creates an element and inserts it into the DOM
RandomFilmLink.prototype.attach = function() {
    if ( this.config.enabled ) {
        var randomFilm = '<span style="float:right; margin-left: 15px"><a href="#" id="randomFilm">Help me pick a film!</a></span>';

        if ( $('div#list_container').length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + randomFilm + '</div>';

            $('#movies').parent().before( container );
        } else {
            $('div#list_container').append( randomFilm );
        }

        var that = this;

        $('div#list_container').on( 'click', 'a#randomFilm', function(e) {
            e.preventDefault();

            that.pickRandomFilm();
        });
    }
};

// Displays a random film on a list
RandomFilmLink.prototype.pickRandomFilm = function() {
    var $unchecked = $('ol#itemListMovies > li.unchecked'),
        randNum;

    if ( $unchecked.length > 0 ) {
        if ( this.config.unique ) {
            // Generate random numbers
            if ( this.randomNums.length === 0 ) {
                // Populate randomNums
                for ( var i = 0; i < $unchecked.length; i++ ) {
                    this.randomNums.push( i );
                }

                // Shuffle the results for randomness in-place
                shuffle( this.randomNums );
            }

            randNum = this.randomNums.pop();
        } else {
            randNum = Math.floor( Math.random() * $unchecked.length );
        }

        $('ol#itemListMovies > li').hide();

        $( $unchecked[ randNum ] ).show();
    }
};

RandomFilmLink.prototype.settings = {
    title: 'Random film link',
    desc: 'Displays "Help me pick a film" link on individual lists',
    index: 'random_film',
    includes: ['icheckmovies.com/lists/(.+)'],
    excludes: ['icheckmovies.com/lists/$'],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'unique',
        desc: 'Unique suggestions (shows each entry only once until every entry has been shown once)',
        type: 'checkbox',
        default: true
    }]
};

// Inherit methods from BaseFeature
UpcomingAwardsList.prototype = Object.create(BaseFeature.prototype);
UpcomingAwardsList.prototype.constructor = UpcomingAwardsList;

function UpcomingAwardsList(config) {
    BaseFeature.call(this, config);
}

UpcomingAwardsList.prototype.attach = function() {
    if ( this.config.enabled && $('#itemListMovies').length ) {
        var totalItems = parseInt($('li#listFilterMovies').text().match(/\d+/));
        var checks      = parseInt($('#topListMoviesCheckedCount').text().match(/\d+/));

        var statistics = '<span><b>Upcoming awards:</b>';

        var abs = this.config.show_absolute;
        var getSpan = function(award, cutoff) {
            var num = Math.ceil(totalItems * cutoff) - checks;
            if (!abs && num <= 0) {
                return '';
            }
            return '<span style="margin-left: 30px">' + award + ': <b>' + num + '</b></span>';
        };

        statistics += getSpan('Bronze', 0.5) + getSpan('Silver', 0.75) +
                      getSpan('Gold', 0.9) + getSpan('Platinum', 1);

        if ( $('div#list_container').length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + statistics + '</div>';

            $('#movies').parent().before( container );
        } else {
            $('div#list_container').append( statistics );
        }
    }
};

UpcomingAwardsList.prototype.settings = {
    title: 'Upcoming awards (individual lists)',
    desc: 'Displays upcoming awards on individual lists',
    index: 'ua_list',
    includes: ['icheckmovies.com/lists/(.+)'],
    excludes: ['icheckmovies.com/list/$'],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'show_absolute',
        desc: 'Display negative values',
        type: 'checkbox',
        default: true
    }]
};

// Inherit methods from BaseFeature
UpcomingAwardsOverview.prototype = Object.create(BaseFeature.prototype);
UpcomingAwardsOverview.prototype.constructor = UpcomingAwardsOverview;

function UpcomingAwardsOverview(config) {
    BaseFeature.call(this, config);

    this.lists = [];
    this.hiddenLists = [];
}

UpcomingAwardsOverview.prototype.attach = function() {
    if ( this.config.enabled ) {
        if ( this.config.autoload ) {
            this.loadAwardData();
        } else {
            var loadLink = '<p id="lad_container"><a id="load_award_data" href="#">Load upcoming awards for this user</a></p>';

            $('#listOrdering').before(loadLink);

            var that = this;

            $('p#lad_container').on('click', 'a#load_award_data', function(e) {
                e.preventDefault();

                $( e.target ).remove();

                that.loadAwardData();
            });
        }
    }
};

UpcomingAwardsOverview.prototype.loadAwardData = function() {
    this.lists = [];
    this.hiddenLists = evalOrParse(gmGetValue('hidden_lists', '[]'));

    this.populateLists();
    this.sortLists();
    this.htmlOut();
};

UpcomingAwardsOverview.prototype.populateLists = function() {
    var that = this,
        $allLists = $('ol#progressall, ol#itemListToplists').children('li'),
        sel = {progress: {rank: 'span.rank', title: 'h3 > a'},
               lists: {rank: 'span.info > strong:first', title: 'h2 > a.title'}},
        // use different selectors depending on page
        curSel = location.href.indexOf('progress') !== -1 ?
                 sel.progress : sel.lists,
        awardTypes = [['Platinum', 1], ['Gold', 0.9], ['Silver', 0.75], ['Bronze', 0.5]];

    $allLists.each(function() {
        var $el = $(this),
            countArr = $el.find(curSel.rank).text().match(/\d+/g);

        if (!countArr) {
            return;
        }

        var checks     = parseInt( countArr[0], 10 ),
            totalItems = parseInt( countArr[1], 10 ),
            $t         = $el.find(curSel.title),
            listTitle  = $t.attr('title').replace(/^View the | top list$/g, ''),
            listUrl    = $t.attr('href');

        awardTypes.forEach(function(award) {
            var awardChecks = Math.ceil(totalItems * award[1]) - checks;
            if (awardChecks <= 0) {
                return false; // exit loop; the order of array is important!
            }

            that.lists.push({
                'awardChecks': awardChecks,
                'awardType':   award[0],
                'listTitle':   listTitle,
                'listUrl':     listUrl
            });
        });
    });
};

UpcomingAwardsOverview.prototype.sortLists = function() {
    // sort lists array by least required checks ASC,
    // then by awards where checks are equal ASC, then by list title ASC
    var awardOrder = { 'Bronze': 0, 'Silver': 1, 'Gold': 2, 'Platinum': 3 };
    this.lists.sort(function(a, b) {
        if (a.awardChecks < b.awardChecks) {
            return -1;
        } else if (a.awardChecks > b.awardChecks) {
            return 1;
        } else if (awardOrder[a.awardType] < awardOrder[b.awardType]) {
            return -1;
        } else if (awardOrder[a.awardType] > awardOrder[b.awardType]) {
            return 1;
        } else if (a.listTitle < b.listTitle) {
            return -1;
        } else if (a.listTitle > b.listTitle) {
            return 1;
        }
        return 0;
    });
};

UpcomingAwardsOverview.prototype.htmlOut = function() {
    var unhideIconData = 'data:text/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjRuqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/26gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrEh546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8VgBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUPujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmHvwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaNZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzSCwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTkSuQmCC';
    var hideIconData = 'data:text/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAADtSURBVHjajFC7DkFREJy9iXg0t+EHRKJDJSqRuIVaJT7AF+jR+xuNRiJyS8WlRaHWeOU+kBy7eyKhs8lkJrOzZ3OWzMAD15gxYhB+yzAm0ndez+eYMYLngdkIf2vpSYbCfsNkOx07n8kgWa1UpptNII5VR/M56Nyt6Qq33bbhQsHy6aR0WSyEyEmiCG6vR2ffB65X4HCwYC2e9CTjJGGok4/7Hcjl+ImLBWv1uCRDu3peV5eGQ2C5/P1zq4X9dGpXP+LYhmYz4HbDMQgUosWTnmQoKKf0htVKBZvtFsx6S9bm48ktaV3EXwd/CzAAVjt+gHT5me0AAAAASUVORK5CYII=';

    var listTable = '<table id="award_table"><thead><tr id="award_table_head"><th>Awards</th><th>Checks</th><th>List title</th><th>(Un)Hide</th></tr></head><tbody>';

    for ( var i = 0; i < this.lists.length; i++ ) {
        var el = this.lists[i],
            unhideIcon = '<img title="Unhide ' + el.listTitle + '" alt="Unhide icon" src="' + unhideIconData + '">',
            hideIcon = '<img title="Hide ' + el.listTitle + '" alt="Hide icon" src="' + hideIconData + '">',
            isHidden = this.hiddenLists.indexOf(el.listUrl) !== -1;

        listTable  += '<tr class="' + (isHidden ? 'hidden-list' : '') +
            '" data-award-type="' + el.awardType + '" data-list-url="' + el.listUrl + '">' +
            '<td style="width: 65px">' + el.awardType + '</td>' +
            '<td style="width: 65px">' + el.awardChecks + '</td>' +
            '<td><div style="height: 28px; overflow: hidden"><a class="list-title" href="' + el.listUrl + '">' + el.listTitle + '</a></div></td>' +
            '<td style="width: 70px"><a href="#" class="icm_hide_list">' + (isHidden ? unhideIcon : hideIcon) + '</a></td></tr>';
    }

    listTable += '</tbody></table>';

    // build the html...
    var toggleUpcomingLink = '<p id="ua_toggle_link_container" style="position: relative; left:0; top:0; width: 200px"><a id="toggle_upcoming_awards" href="#"><span class="_show" style="display: none">Show upcoming awards</span><span class="_hide">Hide upcoming awards</span></a></p>';
    var toggleFullLink     = '<a id="toggle_full_list" href="#"><span class="_show">Show full list</span><span class="_hide" style="display: none">Minimize full list</span></a>';
    var toggleHiddenLink   = '<a id="toggle_hidden_list" href="#">Show hidden</a>';

    var links = '<p id="award_display_links" style="position: absolute; right: 0; top: 0; font-weight: bold">Display: <a id="display_all" href="#">All</a>, ' +
        '<a id="display_bronze" href="#">Bronze</a>, <a id="display_silver" href="#">Silver</a>, <a id="display_gold" href="#">Gold</a>, ' +
        '<a id="display_platinum" href="#">Platinum</a>, ' + toggleFullLink + ', ' + toggleHiddenLink + '</p>';

    var awardContainer = '<div id="award_container" class="container" style="position: relative; top: 0; width: 830px; height: 240px; overflow: scroll">' + listTable + '</div>';

    var allHtml = '<div id="icm_award_html_container" style="z-index: 0; position: relative; margin-top: 0; margin-bottom: 20px">' + toggleUpcomingLink + links + awardContainer + '</div>';

    $('#icm_award_html_container, #ua_toggle_link_container').remove();

    if (location.href.indexOf('progress') !== -1) {
        $('#listOrdering').before(allHtml);
    } else {
        $('#itemContainer').before(allHtml);
    }

    var $lists = $('#award_table > tbody > tr');

    // hide hidden
    $lists.filter('.hidden-list').hide();

    var _this = this;

    $('a.icm_hide_list').on('click', function(e) {
        e.preventDefault();

        var $parent = $(this).parent().parent(),
            listTitle = $.trim($parent.find('.list-title').text()),
            listUrl = $parent.data('list-url'),
            ind = _this.hiddenLists.indexOf(listUrl),
            hide = ind === -1;

        if (hide) { // hide list
            _this.hiddenLists.push(listUrl);
        } else { // unhide list
            _this.hiddenLists.splice(ind, 1);
        }

        $lists.filter(hide ? 'tr' : 'tr.hidden-list')
            .filter(function() { // get all awards with the same url
                return $(this).data('list-url') === listUrl;
            })
            .toggleClass('hidden-list', hide).hide()
            .find('.icm_hide_list > img').attr({
                src: hide ? unhideIconData : hideIconData,
                alt: (hide ? 'Unhide ' : 'Hide ') + 'Icon',
                title: (hide ? 'Unhide ' : 'Hide ') + listTitle
            });

        // save hidden lists
        gmSetValue('hidden_lists', JSON.stringify(_this.hiddenLists));
    });

    $('#toggle_hidden_list').on('click', function(e) {
        e.preventDefault();

        $lists.hide();
        $lists.filter('.hidden-list').show();
    });

    $('#ua_toggle_link_container').on('click', 'a#toggle_upcoming_awards span', function(e) {
        e.preventDefault();

        $('#award_display_links, #award_container').toggle();
        $('a#toggle_upcoming_awards span').toggle();
    });

    $('#award_display_links').on('click', 'a#display_all', function(e) {
        e.preventDefault();

        $lists.hide();
        $lists.not('.hidden-list').show();
    });

    $('#award_display_links').on('click', 'a#display_bronze, a#display_silver, a#display_gold, a#display_platinum', function(e) {
        e.preventDefault();

        var awardType = $(this).attr('id').split('_')[1];
        $lists.hide().filter(function() {
            return !$(this).hasClass('hidden-list') &&
                    $(this).data('award-type').toLowerCase() === awardType;
        }).show();
    });

    $('#award_display_links').on('click', 'a#toggle_full_list span._show', function(e) {
        e.preventDefault();

        $('a#toggle_full_list span').toggle();
        $('div#award_container').css('height', 'auto');
    });

    $('#award_display_links').on('click', 'a#toggle_full_list span._hide', function(e) {
        e.preventDefault();

        $('a#toggle_full_list span').toggle();
        $('div#award_container').css('height', '240px');
    });
};

UpcomingAwardsOverview.prototype.settings = {
    title: 'Upcoming awards overview',
    desc: 'Displays upcoming awards on progress page',
    index: 'ua',
    includes: ['/profiles/progress/',
               '/lists/favorited/',
               '/lists/watchlist/',
               '/lists/disliked/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'autoload',
        desc: 'Autoload',
        type: 'checkbox',
        default: true
    }]
};

// Inherit methods from BaseFeature
ListCustomColors.prototype = Object.create(BaseFeature.prototype);
ListCustomColors.prototype.constructor = ListCustomColors;

function ListCustomColors(config) {
    BaseFeature.call(this, config);
}

ListCustomColors.prototype.attach = function() {
    if ( this.config.enabled ) {
        var listColorsCss = '';

        var buildCSS = function(className, color) {
            if (!color.length) {
                return;
            }
            var sel = 'ol#itemListMovies li.' + className;
            listColorsCss += sel + ', ' + sel + ' ul.optionIconMenu { background-color: ' + color + ' !important; }';
        };

        buildCSS('favorite', this.config.colors.favorite);
        buildCSS('watch', this.config.colors.watchlist);
        buildCSS('hated', this.config.colors.disliked);

        gmAddStyle(listColorsCss);
    }
};

ListCustomColors.prototype.settings = {
    title: 'Custom list colors',
    desc: 'Changes entry colors on lists to visually separate entries in your favorites/watchlist/dislikes',
    index: 'list_colors',
    includes: ['icheckmovies.com/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'colors.favorite',
        desc: 'Favorites',
        type: 'textinputcolor',
        default: '#ffdda9'
    }, {
        name: 'colors.watchlist',
        desc: 'Watchlist',
        type: 'textinputcolor',
        default: '#ffffd6'
    }, {
        name: 'colors.disliked',
        desc: 'Disliked',
        type: 'textinputcolor',
        default: '#ffad99'
    }]
};

// Inherit methods from BaseFeature
ListCrossCheck.prototype = Object.create(BaseFeature.prototype);
ListCrossCheck.prototype.constructor = ListCrossCheck;

function ListCrossCheck(config) {
    BaseFeature.call(this, config);

    this.activatedOnce = false;
    this.init();
}

/**
 * Initialize object variables
 */
ListCrossCheck.prototype.init = function() {
    this.activated = false;

    // array of movie objects
    this.movies = [];

    // array of top list objects
    this.toplists = [];

    // number of total toplists
    this.numToplists = 0;

    // cross-referencing in progress
    this.inProgress = false;

    // current top list's number that is checked
    this.sequenceNumber = 0;
};

ListCrossCheck.prototype.attach = function() {
    if (this.config.enabled && $('#itemListToplists').length) {
        var actions = '<div id="crActions" style="margin-bottom: 18px"><button id="cfgListCCActivate">Activate CR</button></div>';

        $('#itemContainer').before(actions);

        var _t = this;

        $('div#crActions').on( 'click', 'button#cfgListCCActivate', function() {
            $(this).prop('disabled', true);

            _t.createTab();

            _t.activate();
        });

        var customCSS = '<style type="text/css">' +
            'ol#itemListToplists li.icme_listcc_selected, ol#itemListToplists li.icme_listcc_hover, ' +
            '.icme_listcc_selected .progress, .icme_listcc_hover .progress' +
            ' { background-color: #cccccc !important; }' +
            'ol#itemListToplists li.icme_listcc_pending, .icme_listcc_pending .progress { background-color: #ffffb2 !important; }' +
            '</style>';

        $('body').append(customCSS);
    }
};

ListCrossCheck.prototype.activate = function() {
    this.init();

    this.activated = true;

    var _t = this;

    $('button#cfgListCCActivate').after(' <button id="cfgListCCDeactivate">Deactivate</button>');

    $('div#crActions').on('click', 'button#cfgListCCDeactivate', function() {
        _t.deactivate();

        $('button#cfgListCCActivate').prop('disabled', false);
    });

    if ( !this.activatedOnce ) { // ff 3.6 compatibility (ff 3.6 fails to unbind the events in all possible ways)
        $('ol#itemListToplists li').on('click mouseover mouseout', function(e) {
            if ( _t.activated && !_t.inProgress ) { // ff 3.6 compatibility
                // these event actions must not work for cloned toplists under the selected tab
                if ( !$(this).hasClass('icme_listcc') ) {
                    if ( e.type === 'mouseover' && !$(this).hasClass('icme_listcc_selected') ) {
                        $(this).addClass('icme_listcc_hover').find('span.percentage').hide();
                    } else if ( e.type === 'mouseout' && !$(this).hasClass('icme_listcc_selected') ) {
                        $(this).removeClass('icme_listcc_hover').find('span.percentage').show();
                    } else if ( e.type === 'click' ) {
                        $(this).removeClass('icme_listcc_hover');

                        if ( $(this).hasClass('icme_listcc_selected') ) {
                            $(this).removeClass('icme_listcc_selected').addClass('icme_listcc_hover');
                        } else {
                            $(this).addClass('icme_listcc_selected');
                        }
                    }
                }

                return false; // ff 3.6 compatibility
            }
        });

        this.activatedOnce = true;
    }
};

ListCrossCheck.prototype.deactivate = function() {
    var selectedToplists = $('li.icme_listcc_selected', 'ul#topLists');

    // if there's still selected top lists, change them back to normal
    $(selectedToplists).removeClass('icme_listcc_selected').find('span.percentage').show();

    $('ol#itemListToplists').children('li').removeClass('icme_listcc_selected').removeClass('icme_listcc_hover');
    $('button#icme_listcc_check, button#cfgListCCDeactivate').remove();
    $('li#topListCategoryCCSelected').remove();
    $('button#cfgListCCActivate').prop('disabled', false);

    this.init();
};

/**
 * Check through every selected top list
 */
ListCrossCheck.prototype.check = function() {
    var toplistCont = $('ol#itemListToplists');

    // make selected top lists normal under the regular tabs
    toplistCont.children('li.icme_listcc_selected').removeClass('icme_listcc_selected').find('span.percentage').show();

    // get selected top lists
    var $toplists = toplistCont.children('li.icme_listcc');

    this.numToplists = $toplists.length;
    this.inProgress = true;

    // sort selected top lists in ascending order by number of unchecked films
    var getUnchecked = function(x) {
        var checks = $(x).find('span.info > strong:first').text().split('/');
        return checks[1] - checks[0];
    };
    $toplists.sort(function(a, b) {
        return getUnchecked(a) < getUnchecked(b) ? -1 : 1;
    });

    // make selected toplists highlighted under the selected tab
    $toplists.addClass('icme_listcc_selected').find('span.percentage').hide();

    this.toplists = $toplists.get();
    this.getUncheckedFilms(this.toplists[this.sequenceNumber]);
};

/**
 * Get unchecked films from a top list
 *
 * @param listElem jQuery object of the top list element
 */
ListCrossCheck.prototype.getUncheckedFilms = function(listElem) {
    var url = $(listElem).find('a').attr('href');

    $(listElem).addClass('icme_listcc_pending');

    var _t = this;

    $.get(url, function(response) {
        $(listElem).removeClass('icme_listcc_selected icme_listcc_pending').find('span.percentage').show();

        var filter = _t.config.checks ? '' : 'li.unchecked';
        // the site returns html with extra whitespace
        var unchecked = $($.parseHTML(response)).find('ol#itemListMovies').children(filter);

        _t.updateMovies( unchecked );
    });
};

/**
 * Update array of movies
 *
 * @param content jQuery object that consists of unchecked movies (<li> elements) on a top list page
 */
ListCrossCheck.prototype.updateMovies = function(content) {
    var movieTitles = content.find('h2');

    this.sequenceNumber += 1;

    // keeps track if at least one movie on the current top list is also found on all previous top lists
    // if the script is currently checking for movies found on all top lists. it's a major optimization
    // that halts the script if there's a top list with 0 matches especially early on and doesn't go on
    // to check all the rest of the lists wasting time
    var globalToplistMatch = false;

    var showPerfectMatches = this.config.match_all;

    for (var i = 0; i < $(movieTitles).length; i++) {
        var found = false,
            curTitle = $(movieTitles[i]),
            movie = $.trim(curTitle.text()),
            movieUrl = curTitle.find('a').attr('href'),
            movieYear = curTitle.next('span.info').children('a:first').text();

        for ( var j = 0; j < this.movies.length; j++ ) {
            // compare urls as they're guaranteed to be unique
            // in some cases movie title and release year are the same for different movies
            // which results in incorrect top list values
            if ( movieUrl === this.movies[j].u ) {
                this.movies[j].c += 1;

                this.movies[j].jq.find('.rank').html(this.movies[j].c);
                found = true;

                globalToplistMatch = true;

                break;
            }
        }

        // if a movie wasn't found on previous top lists
        if ( !found ) {
            // add it to the main movies array only if the script is not checking for matches on all top lists
            // OR if the script is checking for matches on all top lists, but this is just the first top list
            if ( !showPerfectMatches || this.sequenceNumber === 1 ) {
                var $item = $(content[i]);
                $item.find('.rank').html('0');

                var itemid = $item.attr('id');

                // check if owned
                var owned = evalOrParse(gmGetValue('owned_movies', '[]'));
                if (owned.indexOf(itemid) !== -1) {
                    $item.removeClass('notowned').addClass('owned');
                }

                // t = title, c = count, u = url, y = year
                this.movies.push( {t: movie, c: 1, u: movieUrl, y: movieYear, jq: $item} );
            }
        }
    }

    var hasToplistsLeft = this.sequenceNumber < this.toplists.length;

    // if finding movies on all selected top lists
    if ( showPerfectMatches ) {
        // if one or more movies was found on all selected top lists
        if ( globalToplistMatch ) {
            // if not first top list, extract movies that have been found on all selected top lists
            if ( this.sequenceNumber > 1 ) {
                var cutoff = this.sequenceNumber;
                this.movies = $.grep(this.movies, function(el) {
                    return el.c === cutoff;
                });
            }
        // if didn't find a single match, abort if it's the last or not the first top list
        } else if ( this.sequenceNumber > 1 || !hasToplistsLeft ) {
            this.movies = [];
            hasToplistsLeft = false; // force output
        }
    }

    // if there's still more top lists
    if ( hasToplistsLeft ) {
        this.getUncheckedFilms(this.toplists[this.sequenceNumber]);
    } else {
        this.outputMovies();
    }
};

ListCrossCheck.prototype.outputMovies = function() {
    var showPerfectMatches = this.config.match_all;

    if ( !showPerfectMatches ) {
        var limit = this.config.match_min;

        if ( limit > 0 ) {
            this.movies = $.grep(this.movies, function(el) {
                return el.c >= limit;
            });
        }
    }

    // Sort by checks DESC, then by year ASC, then by title ASC
    this.movies.sort(function(a, b) {
        if (a.c > b.c) {
            return -1;
        } else if (a.c < b.c) {
            return 1;
        } else if (a.y < b.y) {
            return -1;
        } else if (a.y > b.y) {
            return 1;
        } else if (a.t < b.t) {
            return -1;
        } else if (a.t > b.t) {
            return 1;
        }
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
            menu += '<li><b>' + $(this.toplists[i]).find('h2').text() + '</b></li>';
        }

        menu += '</ul><ul class="tabMenu tabMenuPush">' +
            '<li class="topListMoviesFilter active">' +
            '<a href="#" title="View all movies">All (' + this.movies.length + ')</a></li>' +
            '<li class="listFilterExportCSV">' +
            '<a href="#" title="Export all movies in CSV format">Export CSV</a></li>' +
            /*'<li class="topListMoviesFilter " id="listFilterChecked">' +
            '<a title="View all your checked movies" href="#" id="linkListFilterChecked">Checked <span id="topListMoviesCheckedCount"></span></a></li>' +
            '<li class="topListMoviesFilter " id="listFilterUnchecked">' +
            '<a title="View all your unchecked movies" href="#" id="linkListFilterUnchecked">Unchecked <span id="topListMoviesUncheckedCount"></span></a></li>' +*/
            '</ul>';

        // hide previous movie list
        $('#itemListMovies').removeAttr('id').hide();

        $('#itemContainer').after('<ol id="itemListMovies" class="itemList listViewNormal"></ol>');
        $('#itemContainer').after(menu);
        for (i = 0; i < this.movies.length; ++i) {
            $('#itemListMovies').append(this.movies[i].jq);
        }

        $('#itemListMovies').children('li').show();

        $('.topListMoviesFilter a').on('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            var $this = $(this),
                $movielist = $this.parent().parent().next();

            if ($movielist.is(':visible')) {
                $this.parent().removeClass('active');
                $movielist.removeAttr('id').hide();
            } else {
                $this.parent().addClass('active');
                $movielist.attr('id', 'itemListMovies').show();
            }
        });
        $('.listFilterExportCSV a').on('click', function(e) {
            e.preventDefault();

            var data = '"found_toplists","title","year","official_toplists","imdb"\n',
                $items = $('#itemListMovies').children('li');

            for (var i = 0; i < $items.length; ++i) {
                var $item = $($items[i]),
                    foundToplists = $item.find('.rank').text(),
                    title = $item.find('h2').text().trim().replace('"', '""'),
                    year = $item.find('.info a:first').text(),
                    toplists = parseInt($item.find('.info a:last').text()),
                    imdburl = $item.find('.optionIMDB').attr('href'),
                    line = '"' + foundToplists + '",' +
                           '"' + title + '",' +
                           '"' + year + '",' +
                           '"' + toplists + '",' +
                           '"' + imdburl + '"\n';

                data += line;
            }

            window.location.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(data);
        });
    } else {
        $('#icme-crossref-notfound').remove();
        $('#itemContainer').after('<div id="icme-crossref-notfound">Found 0 movies.</div>');
    }

    this.deactivate();
};

ListCrossCheck.prototype.createTab = function() {
    if ($('#listFilterCRSelected').length) {
        return;
    }

    var tab = '<li id="listFilterCRSelected"><a href="#" class="icme_listcc">Cross-reference</a><strong style="display: none">Cross-reference</strong></li>';

    var $tlfilter = $('ul.tabMenu', 'div#itemContainer');
    $tlfilter.append( tab );

    var _t = this;

    // Modified from ICM source. Make the tab work.
    $('#listFilterCRSelected a').on('click', function () {
        var a = $(this).attr('class'),
            b = $(this).closest('li');
        $('.tabMenu').find('li').each(function () {
            $(this).removeClass('active');
        });
        b.addClass('active');

        if ( a === 'icme_listcc' && !_t.inProgress ) {
            var $topListUl = $('ol#itemListToplists');
            $topListUl.children('li.icme_listcc').remove();

            var $topLists = $topListUl.children('li.icme_listcc_selected').clone();

            //$topListUl.children("li.icme_listcc_selected").removeClass("icme_listcc_selected");

            $topLists.removeClass('imdb critics prizes website institute misc icme_listcc_selected').addClass('icme_listcc').find('span.percentage').show();

            $topListUl.append( $topLists );

            if ( $('li.icme_listcc', 'ol#itemListToplists').length >= 2 && $('button#icme_listcc_check').length === 0 ) {
                var btn = '<button id="icme_listcc_check">Cross-reference</button>';

                $('div#crActions').append(btn);

                $('button#icme_listcc_check').on('click', function() {
                    $(this).prop('disabled', true);

                    _t.check();
                });

                // Make the current tab work if we want to return to it
                $('ul.tabMenu').children('li').each(function() {
                    if (!$(this).children('a').length) {
                        var $clicked = $(this);
                        $clicked.on('click', function() {
                            $('ol#itemListToplists').children('li').show();
                            $('ul.tabMenu').children('li').removeClass('active');
                            $clicked.addClass('active');
                            $('ol#itemListToplists').children('li.icme_listcc').remove();
                        });
                    }
                });
            } else if ( $('li.icme_listcc', 'ol#itemListToplists').length < 2 && $('button#icme_listcc_check').length === 1 ) {
                $('button#icme_listcc_check').remove();
            }
        }

        b = $('ol#itemListToplists');
        b.find('li').hide();
        b.find('li.' + a).show();

        return false;
    });
};

ListCrossCheck.prototype.settings = {
    title: 'List cross-reference',
    desc: 'Cross-reference lists to find what films they share',
    index: 'list_cross_ref',
    includes: ['icheckmovies.com/lists/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }, {
        name: 'match_all',
        desc: 'Find films that appear on all selected lists',
        type: 'checkbox',
        default: true
    }, {
        name: 'match_min',
        desc: 'If the above checkbox is unchecked, find films that appear on this many lists',
        type: 'textinput',
        default: 2
    }, {
        name: 'checks',
        desc: 'Include your checks in results (full intersection)',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
HideTags.prototype = Object.create(BaseFeature.prototype);
HideTags.prototype.constructor = HideTags;

function HideTags(config) {
    BaseFeature.call(this, config);
}

HideTags.prototype.attach = function() {
    if (this.config.enabled) {
        gmAddStyle('ol#itemListToplists li .info:last-child, ol#itemListMovies li .tagList { display: none !important; }');

        if (this.config.show_hover) {
            gmAddStyle('ol#itemListToplists li:hover .info:last-child, ol#itemListMovies li:hover .tagList { display: block !important; }');
        }
    }
};

HideTags.prototype.settings = {
    title: 'Hide tags',
    desc: 'Hides tags on individual lists',
    index: 'hide_tags',
    includes: ['icheckmovies.com/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }, {
        name: 'show_hover',
        desc: 'Show tags when moving the cursor over a movie',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
WatchlistTab.prototype = Object.create(BaseFeature.prototype);
WatchlistTab.prototype.constructor = WatchlistTab;

function WatchlistTab(config) {
    BaseFeature.call(this, config);
}

WatchlistTab.prototype.attach = function() {
    if (!this.config.enabled) {
        return;
    }

    var $movies = $('#itemListMovies');
    if ($movies.length === 0) {
        return;
    }

    var watchCount = $movies.children('li.watch').length;
    var tabHtml = '<li id="listFilterWatch" class="topListMoviesFilter">' +
        '<a id="linkListFilterWatch" href="#" title="View all your watchlist movies">Watchlist ' +
        '<span id="topListMoviesWatchCount">(' + watchCount + ')</span></a>' +
        '</li>';

    $('#listFilterUnchecked').after(tabHtml);

    var $first = $('#listFilterMovies').find('a');
    $first.text($first.text().replace(' movies', ''));

    // move the order by and views to filter box
    if ($('#orderByAndView').length === 0) {
        $('#topList').append('<div id="orderByAndView" style="z-index:200;position:absolute;top:30px;right:0;width:300px;height:20px"> </div>');
        $('#listOrdering').detach().appendTo('#orderByAndView');
        $('#listViewswitch').detach().appendTo('#orderByAndView');
    }

    $('#linkListFilterWatch').on('click', function() {
        $movies = $('#itemListMovies');
        $movies.children('li').hide();
        $movies.children('li.watch').show();

        $('.tabMenu', '#itemContainer').children('li').removeClass('active');
        $(this).parent('li').addClass('active');

        return false;
    });
};

WatchlistTab.prototype.settings = {
    title: 'Watchlist tab',
    desc: 'Creates a tab on lists that shows watchlist entries.',
    index: 'watchlist_tab',
    includes: ['icheckmovies.com/lists'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
Owned.prototype = Object.create(BaseFeature.prototype);
Owned.prototype.constructor = Owned;

function Owned(config) {
    BaseFeature.call(this, config);
}

Owned.prototype.attach = function() {
    if (!this.config.enabled) {
        return;
    }

    var $movielist = $('#itemListMovies'),
        $markOwned = $('.optionMarkOwned');
    // Check if 'owned' button exists
    if (!$markOwned.length) {
        return;
    }

    if (this.config.free_account) {
        var owned = evalOrParse(gmGetValue('owned_movies', '[]')),
            onListPage = $movielist.length !== 0;

        // mark owned movies as owned
        $markOwned.each(function() {
            var $checkbox = $(this).closest('.optionIconMenu').prev('.checkbox'),
                $movie = $checkbox.parent(),
                movieId = $checkbox.attr('id').replace('check', 'movie'),
                ind = owned.indexOf(movieId);

            // if movie id is found in cached owned movies
            if (ind !== -1) {
                $movie.toggleClass('notowned owned');
            }

            // remove paid feature crap
            $(this).removeClass('paidFeature');
        });

        $('.optionMarkOwned').on('click', function() {
            owned = evalOrParse(gmGetValue('owned_movies', '[]'));

            var $checkbox = $(this).closest('.optionIconMenu').prev('.checkbox'),
                $movie = $checkbox.parent(),
                movieId = $checkbox.attr('id').replace('check', 'movie'),
                ind = owned.indexOf(movieId);

            // if movie id is found in cached owned movies
            console.log((ind !== -1 ? 'removing' : 'storing') + ' ' + movieId);
            if (ind !== -1) {
                owned.splice(ind, 1);
            } else {
                owned.push(movieId);
            }
            $movie.toggleClass('notowned owned');

            if (onListPage) {
                var ownedCount = $movielist.children('li.owned').length;
                $('#topListMoviesOwnedCount').text('(' + ownedCount + ')');
            }

            gmSetValue('owned_movies', JSON.stringify(owned));

            return false;
        });
    }

    var ownedCount = $movielist.children('li.owned').length;
    var tabHtml = '<li id="listFilterOwned" class="topListMoviesFilter">' +
        '<a id="linkListFilterOwned" href="#" title="View all your owned movies">Owned ' +
        '<span id="topListMoviesOwnedCount">(' + ownedCount + ')</span></a>' + '</li>';

    $('#listFilterNew').before(tabHtml);

    var $first = $('#listFilterMovies').find('a');
    $first.text($first.text().replace(' movies', ''));

    // move the order by and views to filter box
    if (!$('#orderByAndView').length && $('#topList').length) {
        $('#topList').append('<div id="orderByAndView" style="z-index:200;position:absolute;top:30px;right:0;width:300px;height:20px"> </div>');
        $('#listOrdering').detach().appendTo('#orderByAndView');
        $('#listViewswitch').detach().appendTo('#orderByAndView');
    }

    $('#linkListFilterOwned, #listFilterOwned').on('click', function() {
        $movielist = $('#itemListMovies');
        $movielist.children('li').hide();
        $movielist.children('li.owned').show();

        $('.tabMenu', '#itemContainer').children('li').removeClass('active');
        $(this).parent('li').addClass('active');

        return false;
    });
};

Owned.prototype.settings = {
    title: 'Owned tab',
    desc: 'Creates a tab on lists that shows owned entries. Emulates the paid feature',
    index: 'owned_tab',
    includes: ['icheckmovies.com/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }, {
        name: 'free_account',
        desc: 'I have a free account (must uncheck if you have a paid account)',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
LargeList.prototype = Object.create(BaseFeature.prototype);
LargeList.prototype.constructor = LargeList;

function LargeList(config) {
    BaseFeature.call(this, config);

    this.loaded = false;
}

LargeList.prototype.attach = function() {
    if (!this.config.enabled) {
        return;
    }

    if (this.config.autoload) {
        this.load();
    } else {
        // create link
        var link = '<span style="float: right; margin-left: 15px"><a id="icme_large_posters" href="#">Large posters</a></span>';

        if ( $('div#list_container').length !== 1 ) {
            var container = '<div id="list_container" style="height: 35px; position: relative">' + link + '</div>';

            $('#movies').parent().before( container );
        } else {
            if ($('#list_container').find('p').length === 1) {
                $('#list_container p:first').append('<span> &mdash; </span>' + link);
            } else {
                $('div#list_container').append( link );
            }
        }

        var _t = this;
        $('#icme_large_posters').on('click', function(e) {
            e.preventDefault();

            _t.load();
        });
    }
};

LargeList.prototype.load = function() {
    if (this.loaded) {
        return;
    }

    this.loaded = true;

    var style = '#itemListMovies > .listItem { float:left !important; height: 330px !important; width: 255px !important; }' +
        '.listItem .listImage { float:none !important; width: 230px !important; height: 305px !important; left:-18px !important; top:-18px !important; margin:0!important }' +
        '.listImage a {width:100% !important; height:100% !important; background: url("/images/dvdCover.png") no-repeat scroll center center transparent !important;}' +
        '.listImage .coverImage { width:190px !important; height:258px !important; top:21px !important; left: 19px !important; right:auto !important; }' +
        '.listItem .rank { top: 15px !important; position:absolute !important; height:auto !important; width:65px !important; right:0 !important; margin:0 !important; font-size:30px !important }' +
        '.listItem .rank .positiondifference span { font-size: 12px !important }' +
        '.listItem h2 { z-index:11 !important; font-size:14px !important; width:100% !important; margin:-30px 0 0 0 !important; }' +
        '.listItem .info { font-size:12px !important; width:100% !important; height:auto !important; line-height:16px !important; margin-top:4px !important }' +
        '.checkbox { top:85px !important; right:12px !important }' +
        '#itemListMovies .optionIconMenu { top:120px !important; right:20px !important }' +
        '#itemListMovies .optionIconMenu li { display: block !important }' +
        '#itemListMovies .optionIconMenuCheckbox { right:20px !important }';

    gmAddStyle(style);

    var $c = $('#itemListMovies').find('div.coverImage').hide();
    for (var i = 0; i < $c.length; i++) {
        var cururl = $c[i].style.backgroundImage;
        if (cururl.substr(4, 1) !== 'h') {
            cururl = cururl.slice(5, -2).replace('small', 'medium').replace('Small', 'Medium');
        } else { // chrome handles urls differently
            cururl = cururl.slice(4, -1).replace('small', 'medium').replace('Small', 'Medium');
        }
        var img = document.createElement('img');
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY5j8rA8ABBcCCCnPKCcAAAAASUVORK5CYII=';
        img.className = 'coverImage';
        img.setAttribute('data-original', cururl);
        $c[i].parentNode.appendChild(img);
    }

    $('img.coverImage').lazyload({ threshold: 200 });
};

LargeList.prototype.settings = {
    title: 'Large posters',
    desc: 'Display large posters on individual lists (large posters are lazy loaded)',
    index: 'large_lists',
    includes: ['icheckmovies\\.com/lists/(.+)/(.*)'],
    excludes: ['icheckmovies\\.com/lists/favorited',
               'icheckmovies\\.com/lists/disliked',
               'icheckmovies\\.com/lists/watchlist'],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'autoload',
        desc: 'Autoload',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
ListOverviewSort.prototype = Object.create(BaseFeature.prototype);
ListOverviewSort.prototype.constructor = ListOverviewSort;

function ListOverviewSort(config) {
    BaseFeature.call(this, config);
}

ListOverviewSort.prototype.attach = function() {
    if (!this.config.enabled) {
        return;
    }

    if ( this.config.single_col ) {
        gmAddStyle('.itemList .listItem.listItemProgress { float: none !important; }');
    }

    var order = this.config.order === true ? 'desc' : 'asc';
    this.rearrange(order, 'all');

    var _t = this;
    $('#progressFilter a').not('#progressFilter-all').one('click', function() {
        var section = $(this).attr('id').split('-')[1];
        _t.rearrange(order, section);
    });
};

ListOverviewSort.prototype.rearrange = function(order, section) {
    var $toplistList = $('#progress' + section),
        $toplistItems = $toplistList.children('li').detach(),
        isInterweaved = true;

    if ( this.config.hide_imdb && section === 'all') {
        if (this.config.autosort) {
            $toplistItems = $toplistItems.not('.imdb');
            // list would be sorted anyway, but until then the order is incorrect
        } else {
            // preserve original order
            $toplistItems = $(this.straighten($toplistItems.toArray())).not('.imdb');
            isInterweaved = false;
        }
    }

    var toplistArr = $toplistItems.toArray();

    if (this.config.autosort) {
        var lookupMap = toplistArr.map(function(item, i) {
            var width = $(item).find('span.progress').css('width').replace('px', '');
            return {index: i, value: parseFloat(width)};
        });

        lookupMap.sort(function(a, b) {
            return (order === 'asc' ? 1 : -1) *
                (a.value > b.value ? 1 : -1);
        });

        toplistArr = lookupMap.map(function(e) {
            return toplistArr[e.index];
        });

        isInterweaved = false;
    }

    // check corner cases to avoid excessive sorting
    var verticalOrder = this.config.icebergs || this.config.single_col;
    if (!isInterweaved && !verticalOrder) {
        // restore default two-column view after sorting/hiding
        toplistArr = this.interweave(toplistArr);
    }
    if (isInterweaved && verticalOrder) {
        // no sorting/hiding happened; rearrange the list with original order
        toplistArr = this.straighten(toplistArr);
    }
    $toplistList.append(toplistArr);
};

// [1, 'a', 2, 'b', 3, 'c']    -> [1, 2, 3, 'a', 'b', 'c']
// [1, 'a', 2, 'b', 3, 'c', 4] -> [1, 2, 3, 4, 'a', 'b', 'c']
ListOverviewSort.prototype.straighten = function(list) {
    var even = [], odd = [];
    for (var i = 0; i < list.length; i++) {
        if (i % 2 === 0) {
            even.push(list[i]);
        } else {
            odd.push(list[i]);
        }
    }
    return $.merge(even, odd);
};

// [1, 2, 3, 'a', 'b', 'c']    -> [1, 'a', 2, 'b', 3, 'c']
// [1, 2, 3, 4, 'a', 'b', 'c'] -> [1, 'a', 2, 'b', 3, 'c', 4]
ListOverviewSort.prototype.interweave = function(list) {
    var res = [],
        halfLen = Math.ceil(list.length / 2);
    for (var i = 0; i < halfLen; i++) {
        res.push(list[i]);
        if (i + halfLen < list.length) {
            res.push(list[i + halfLen]);
        }
    }
    return res;
};

// tests
/* a = [1, 'a', 2, 'b', 3, 'c', 4, 'd'];
b = [1, 'a', 2, 'b', 3, 'c', 4];
function test(arr) {
    return JSON.stringify(arr) === JSON.stringify(interweave(straighten(arr)));
}
test(a) && test(b) */

ListOverviewSort.prototype.settings = {
    title: 'Progress page',
    desc: 'Change the order of lists on the progress page',
    index: 'toplists_sort',
    includes: ['icheckmovies.com/profiles/progress'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }, {
        name: 'autosort',
        desc: 'Sort lists by completion rate',
        type: 'checkbox',
        default: true
    }, {
        name: 'order',
        desc: 'Descending',
        type: 'checkbox',
        default: true
    }, {
        name: 'single_col',
        desc: 'Single column',
        type: 'checkbox',
        default: false
    }, {
        name: 'icebergs',
        desc: 'Fill columns from left to right',
        type: 'checkbox',
        default: false
    }, {
        name: 'hide_imdb',
        desc: 'Hide IMDb lists from "All" tab',
        type: 'checkbox',
        default: false
    }]
};

// Inherit methods from BaseFeature
ListsTabDisplay.prototype = Object.create(BaseFeature.prototype);
ListsTabDisplay.prototype.constructor = ListsTabDisplay;

function ListsTabDisplay(config) {
    BaseFeature.call(this, config);

    this.block = $('#itemListToplists');
    this.sep = '<li class="groupSeparator"><br><hr><br></li>';
    // multiline regex that leaves only list name, excl. a common beginning and parameters
    this.reURL = /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:icheckmovies.com)?\/?(?:lists)?\/?([^\s\?]+\/)(?:\?.+)?[ \t]*$/gm;
}

ListsTabDisplay.prototype.attach = function() {
    var isOnMoviePage = (new RegExp( this.settings.includes[2] )).test(window.location.href),
        _c = this.config;

    if (isOnMoviePage) {
        var lists = this.block.children();

        if (_c.sort_official) {
            var officialLists = lists
                .has('ul.tagList a[href$="user%3Aicheckmovies"]')
                .filter(function() {
                    // icm bug: deleted lists reset to icheckmovies user
                    return !$(this).find('.title').attr('href').endsWith('//');
                });
            this.move(officialLists);
        }

        if (_c.sort_groups) {
            var _t = this;
            ['group1', 'group2'].forEach(function(group) {
                var stored = _c[group];
                if (typeof stored === 'string') {
                    // Parse textarea content
                    console.log('Parsing ListsTabDisplay group', group);
                    stored = stored.trim().replace(_t.reURL, '$1').split('\n');
                    _c[group] = stored;
                    _t.globalConfig.save();
                }
                var personal = _t.getLists(stored);
                _t.move(personal);
            });
        }

        if (_c.sort_filmos) {
            var filmos = lists.filter(function() {
                return $(this).text().toLowerCase().indexOf('filmography') >= 0;
            });
            this.move(filmos);
        }

        // visual fix for edge cases when all lists are moved
        lists.last().filter('.groupSeparator').hide();
    } else if (_c.redirect) { // = if on a list page
        var linksToLists = $('.listItemMovie > .info > a:last-of-type');

        linksToLists.each(function () {
            var link = $(this),
                url = link.attr('href').replace('?tags=user:icheckmovies', '');
            link.attr('href', url);
        });
    }
};

ListsTabDisplay.prototype.move = function(lists) {
    if (lists.length) {
        var target = this.block.find('li.groupSeparator').last();
        if (target.length) {
            target.after(lists, this.sep);
        } else {
            this.block.prepend(lists, this.sep);
        }
    }
};

ListsTabDisplay.prototype.getLists = function(listIDs) {
    if (listIDs.length) {
        var selected = this.block.children().filter(function() {
            var href = $(this).find('a.title').attr('href');
            return href && $.inArray(href.substring(7), listIDs) !== -1; // sep matches too
        });
        return selected;
    }
    return [];
};

ListsTabDisplay.prototype.settings = {
    title: 'Lists tab display',
    desc: 'Organize movie info tab with all lists (\/movies\/*\/rankings\/, <a href="/movies/pulp+fiction/rankings/">example</a>)',
    index: 'lists_tab_display',
    includes: ['icheckmovies.com/lists/(.+)',
               'icheckmovies.com/search/movies/(.+)',
               'icheckmovies.com/movies/.+/rankings/(.*)',
               'icheckmovies.com/movies/[^/]*$', // list of all movies
               'icheckmovies.com/movies/((un)?checked|favorited|disliked|owned|watchlist|recommended)/'],
    excludes: [],
    options: [{
        name: 'redirect',
        desc: 'Redirect "in # lists" movie links to "All" lists tab',
        type: 'checkbox',
        default: true
    }, {
        name: 'sort_official',
        desc: 'Auto-sort official lists',
        type: 'checkbox',
        default: true
    }, {
        name: 'sort_filmos',
        desc: 'Auto-sort filmographies',
        type: 'checkbox',
        default: true
    }, {
        name: 'sort_groups',
        desc: 'Auto-sort lists from user defined groups',
        type: 'checkbox',
        default: true
    }, {
        name: 'group1',
        desc: 'Group 1',
        type: 'textarea',
        default: []
    }, {
        name: 'group2',
        desc: 'Group 2',
        type: 'textarea',
        default: []
    }]
};

// Inherit methods from BaseFeature
ExportLists.prototype = Object.create(BaseFeature.prototype);
ExportLists.prototype.constructor = ExportLists;

function ExportLists(config) {
    BaseFeature.call(this, config);
}

ExportLists.prototype.attach = function() {
    var _c = this.config;
    if (!_c.enabled) {
        return;
    }

    var sep = _c.delimiter;

    $('.optionExport').one('click', function() {
        if (sep !== ',' && sep !== ';') {
            sep = '\t';
        }

        var data =  ['rank', 'title', 'aka', 'year', 'official_toplists',
            'checked', 'favorite', 'dislike', 'imdb'].join(sep) + sep + '\n';

        var encodeField = function(field) {
            return field.indexOf('"') !== -1 || field.indexOf(sep) !== -1 ?
                   '"' + field.replace('"', '""', 'g') + '"' :
                   field;
        };

        $('#itemListMovies > li').each(function() {
            var item = $(this),
                rank = item.find('.rank').text().trim().replace(/ .+/, ''),
                title = encodeField(item.find('h2>a').text()),
                aka = encodeField(item.find('.info > em').text()),
                year = item.find('.info a:first').text(),
                toplists = parseInt(item.find('.info a:last').text(), 10),
                checked = item.hasClass('checked') ? 'yes' : 'no',
                isFav = item.hasClass('favorite') ? 'yes' : 'no',
                isDislike = item.hasClass('hated') ? 'yes' : 'no',
                imdburl = item.find('.optionIMDB').attr('href'),
                line = [rank, title, aka, year, toplists, checked,
                    isFav, isDislike, imdburl].join(sep) + sep + '\n';
            data += line;
        });

        // BOM with ; or , as separator and without sep= - for Excel
        var bom = _c.bom ? '\uFEFF' : '',
            dataURI = 'data:text/csv;charset=utf-8,' + bom + encodeURIComponent(data);
        // link swapping with a correct filename - http://caniuse.com/download
        $(this).attr('href', dataURI).attr('download', $('#topList>h1').text() + '.csv');

        // after changing URL jQuery fires a default click event
        // on the link user clicked on, and loads dataURI as URL (!)
        // I could've used preventDefault + change window.location.href,
        // but that way the file wouldn't have a correct filename
    });
};

ExportLists.prototype.settings = {
    title: 'Export lists',
    desc: 'Download any list as .csv (doesn\'t support search results). Emulates the paid feature, so don\'t enable it if you have a paid account',
    index: 'export_lists',
    includes: ['icheckmovies.com/lists/(.+)'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: false
    }, {
        name: 'delimiter',
        desc: 'Use as delimiter (accepts \';\' or \',\'; otherwise uses \\t)',
        type: 'textinput',
        default: ';'
    }, {
        name: 'bom',
        desc: 'Include BOM (required for Excel)',
        type: 'checkbox',
        default: true
    }]
};

// Inherit methods from BaseFeature
ProgressTopX.prototype = Object.create(BaseFeature.prototype);
ProgressTopX.prototype.constructor = ProgressTopX;

function ProgressTopX(config) {
    BaseFeature.call(this, config);
}

ProgressTopX.prototype.attach = function() {
    if (this.config.enabled) {
        var css = 'float: left; margin-right: 0.5em',
            attr = {text: 'Load stats', id: 'icme_req_for_top', href: '#', style: css},
            // can't pass the value directly in case of user changing it and not reloading
            loadLink = $('<a>', attr).click({cfg: this.config}, this.addStats),
            spanElem = $('<span>', {text: ' | ', style: css});

        $('#listOrderingWrapper').prepend(loadLink, spanElem);
    }
};

ProgressTopX.prototype.addStats = function(event) {
    var targetPage = parseInt(event.data.cfg.target_page, 10), // * 25 = target rank
        lists = $('.itemListCompact[id^="progress"]:visible span.rank a');

    lists.each(function() {
        var list = $(this),
            oldText = list.text(),
            curRank = oldText.match(/\d+/);

        if (curRank < targetPage * 25) {
            return;
        }

        var url = list.attr('href').replace(/=.*$/, '=' + targetPage),
            progress = parseInt(list.parent().text().match(/\d+/), 10);

        $.get(url, function(data) {
            data = data.match(/\d+<\/strong> checks in this list,/g).pop().match(/\d+/);
            if (data) {
                var minchecks = parseInt(data[0], 10),
                    dif = minchecks - progress;
                list.text(oldText + ' - ' + minchecks + ' req - ' + dif + ' dif');
                list.attr('href', url);
            }
        });
    });

    return false; // prevents auto-scrolling to the top
};

ProgressTopX.prototype.settings = {
    title: 'Progress top X',
    desc: 'Find out how many checks you need to get into Top 25/50/100/1000/...',
    index: 'progress_top_x',
    includes: ['icheckmovies.com/profiles/progress/'],
    excludes: [],
    options: [{
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: true
    }, {
        name: 'target_page',
        desc: 'Ranking page you want to be on (page x 25 = rank)',
        type: 'textinput',
        default: '40'
    }]
};

/**
 * Main application
 * Register and load modules
 */
function Enhanced(scriptConfig) {
    this.modules = [];
    this.configWindow = new ConfigWindow(scriptConfig);
}

Enhanced.prototype.register = function(module) {
    this.modules.push(module);
    this.configWindow.addModule(module.settings);
};

Enhanced.prototype.load = function() {
    $.each(this.modules, function(i, m) {
        if (m.isEnabled()) {
            console.log('Attaching ' + m.constructor.name);
            m.attach();
        }
    });

    this.configWindow.build();
};

var config = new Config();
// console.log("Loaded config", config); // debug

var useModules = [
    RandomFilmLink,
    HideTags,
    UpcomingAwardsList,
    ListCustomColors,
    UpcomingAwardsOverview,
    ListCrossCheck,
    WatchlistTab,
    Owned,
    LargeList,
    ListOverviewSort,
    ListsTabDisplay,
    ExportLists,
    ProgressTopX
];

var app = new Enhanced(config);
$.each(useModules, function(i, Obj) {
    app.register(new Obj(config));
});
app.load();
console.log('window built');
