// ==UserScript==
// @name           iCheckMovies Enhanced
// @namespace      iCheckMovies
// @description    Adds new features to enhance the iCheckMovies user experience
// @version        1.7.8
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
// @grant          unsafeWindow
// ==/UserScript==

// ----- Utils -----

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var gmInfo = GM_info,
    gmSetValue = GM_setValue,
    gmGetValue = GM_getValue,
    gmAddStyle = GM_addStyle,
    gmGetResourceText = GM_getResourceText;
// jscs:enable requireCamelCaseOrUpperCaseIdentifiers

// + Jonas Raoni Soares Silva
// @ http://jsfromhell.com/array/shuffle [rev. #1]
function shuffle(v) {
    /* jshint nocomma: false, noempty: false */
    // jscs:disable disallowEmptyBlocks
    for (var j, x, i = v.length;
        i > 1;
        j = Math.floor(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x) {
    }

    return v;
    // jscs:enable disallowEmptyBlocks
}

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

/**
 * Create a necessary BaseFeature-settings-options item that defines
 * whether or not a module should be loaded by default.
 * (Should be a BaseFeature method, but the way settings are defined makes it hard.)
 *
 * @param {boolean} isEnabled
 */
function getDefState(isEnabled) {
    return {
        name: 'enabled',
        desc: 'Enabled',
        type: 'checkbox',
        default: isEnabled
    };
}

// ----- Interacting with ICM -----

// mutually exclusive regexes for matching page type
var reICM = Object.freeze({
    movie: // movie pages only, not /movies/ or /movies/checked/ etc. or /rankings/
        /icheckmovies\.com\/movies\/(?!$|\?|(?:(un)?checked|favorited|disliked|watchlist|owned|recommended)\/)[^/]+\/(?!rankings\/)/,
    movieList: // personal user list
        /icheckmovies\.com\/lists\/(?!$|\?|(?:favorited|disliked|watchlist)\/)/,
    movieListGeneral: // /movies/ only
        /icheckmovies\.com\/movies\/(?:$|\?)/,
    movieListSpecial: // /movies/checked/ etc.
        /icheckmovies\.com\/movies\/(?:((un)?checked|favorited|disliked|watchlist|owned|recommended)\/)/,
    movieSearch:
        /icheckmovies\.com\/search\/movies\//,
    movieRankings:
        /icheckmovies\.com\/movies\/[^/]+\/rankings\//,
    listsGeneral: // /lists/ only
        /icheckmovies\.com\/lists\/(?:$|\?)/,
    listsSpecial: // /lists/favorited/ etc.
        /icheckmovies\.com\/lists\/(?:favorited|disliked|watchlist)\//,
    listsSearch:
        /icheckmovies\.com\/search\/lists\//,
    progress:
        /icheckmovies.com\/profiles\/progress\//
});

function addToMovieListBar(htmlStr) {
    var $container = $('#icme_list_container');
    if (!$container.length) {
        $container = $('<div id="icme_list_container" style="height: 35px; ' +
            'position: relative">' + htmlStr + '</div>');

        $('#topList, #listTitle') // movieList and movieListGeneral+Special use different headers
            .nextAll('.container').last()
            .before($container);
    } else {
        $container.append(htmlStr);
    }
}

// ----- Objects -----

function BaseFeature(config) {
    this.updateConfig(config);
}

BaseFeature.prototype.settings = {
    // in general use enableOn, (in|ex)cludes are for special cases and exceptions
    enableOn: [], // string keys of reICM
    includes: [], // additional regexes (str or objects) to include
    excludes: []  // additional regexes (str or objects) to exclude
};

/**
 * Basic function for checking current page type.
 *
 * @param {(string|string[])} keys - A key of reICM, or array of keys
 * @returns {boolean} true if current page matches any of specified regexes
 */
BaseFeature.prototype.matchesPageType = function(keys) {
    return this.getRegexes(Array.isArray(keys) ? keys : [keys]).some(this.testRe);
};

BaseFeature.prototype.testRe = function(strOrRe) {
    if (typeof strOrRe === 'string') {
        strOrRe = new RegExp(strOrRe);
    }

    return strOrRe.test(window.location.href);
};

BaseFeature.prototype.getRegexes = function(arrOfKeys) {
    return arrOfKeys.map(function(key) {
        if (reICM[key] === undefined) {
            throw new TypeError('Invalid icm-regex name: ' + key);
        }

        return reICM[key];
    });
};

BaseFeature.prototype.matchesUrl = function() {
    var _s = this.settings,
        // if an array is not specified, [].some(...) is always false
        matchesPageType = this.matchesPageType(_s.enableOn || []),
        isIncluded = (_s.includes || []).some(this.testRe),
        isExcluded = (_s.excludes || []).some(this.testRe);

    return (matchesPageType || isIncluded) && !isExcluded;
};

// Add module options to the global config;
// Keeps loaded values, excludes outdated options, adds new options
BaseFeature.prototype.updateConfig = function(config) {
    var module = this.settings.index,
        cur = {};

    for (var option of this.settings.options) {
        var idx = option.name,
            oldValue = config.get(module + '.' + idx),
            newValue = oldValue !== undefined ? oldValue : option.default;

        setProperty(idx, cur, newValue);
    }

    // save references to the module and global configs in a module
    this.config = config.cfg[module] = cur;
    this.globalConfig = config; // allows modules to use Save/Set/Get
};

// Config object constructor
function Config() {
    // test:
    // ['1', '1.7', '1.7.1', '1.7.1.1', '1.7.1.1.1'].map(verToNumber) ===
    // [1000, 1700, 1710, 1711, 1711]
    function verToNumber(str) {
        return +(str.replace(/\./g, '') + '0000').slice(0, 4);
    }

    this.cfg = {
        script_config: { // script config
            version: gmInfo.script.version, // dot-separated string
            revision: verToNumber(gmInfo.script.version) // 4-digit number
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
        console.log('Updating to ' + n.revision);
        this.save();
    }
};

// Save config
Config.prototype.save = function() {
    // console.log("Saving config", this.cfg); // debug
    gmSetValue('icm_enhanced_cfg', JSON.stringify(this.cfg));
};

// Get config value
Config.prototype.get = function(index) {
    return getProperty(index, this.cfg);
};

// Set config value
Config.prototype.set = function(index, value) {
    setProperty(index, this.cfg, value);
};

// Sets false to true and vice versa
Config.prototype.toggle = function(index) {
    var val = this.get(index),
        changeVal;

    if (val === true || val === false) {
        changeVal = !val;
    } else if (val === 'asc' || val === 'desc') {
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
            str += '<p' + (opt.inline ? ' class="inline-opt"' : '') + '>' +
                   (opt.frontDesc || '') + '<input type="checkbox"' + indexAttr +
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
    this.modules.sort(function(a, b) {
        return a.title > b.title ? 1 : -1;
    });

    // Create and append a new item in the drop down menu under your username
    var cfgLink = '<li><a id="icm_enhanced_cfg" href="#"' +
        'title="Configure iCheckMovies Enhanced script options">ICM Enhanced</a></li>';

    $('ul#profileOptions').append(cfgLink);

    // Custom CSS for jqmodal
    var customCSS =
        '.jqmWindow { ' +
            'display: none; position: absolute; font-family: verdana, arial, sans-serif; ' +
        'background-color:#fff; color:#000; padding: 12px 30px;}' +
        '.jqmOverlay { background-color:#000 }' +
        'div.icme_cfg_feature { margin-bottom: 15px; }' +
        'span.has_settings:hover { text-decoration: underline; }' +
        'div.icme_cfg_feature > div.icme_cfg_settings { ' +
            'display: none; margin-left: 22px; margin-top: 10px; }' +
        'span.icme_feature_title { font-weight: bold; }' +
        'input[type=text] { font-family: monospace }' +
        '#module_settings { margin:10px 0; }' +
        '#module_settings > p { margin-bottom: 0.5em; }' +
        '#module_settings > p.inline-opt { display: inline-block; margin-right: 5px }' +
        '#configSave { position: absolute; bottom:15px; left: 30px }' +
        'hr { border:0; height:1px; width:100%; background-color:#aaa; }';

    gmAddStyle(customCSS);

    var moduleList = '<select id="modulelist" name="modulelist">';
    for (var m of this.modules) {
        moduleList += '<option>' + m.title + '</option>';
    }

    moduleList += '</select>';

    // HTML for the main jqmodal window
    var ver = this.config.cfg.script_config.version,
        cfgMainDesc = 'iCheckMovies Enhanced ' + ver + ' configuration',
        cfgMainHtml = '<div class="jqmWindow" id="cfgModal">' +
            '<h3 style="color:#bbb">' + cfgMainDesc + '</h3>' +
            moduleList +
            '<hr><div id="module_settings"></div>' +
            '<button id="configSave">Save settings</button>' +
        '</div>';

    // style & append config window
    $(cfgMainHtml).css({
        top: '17%', left: '50%', marginLeft: '-400px', width: '800px', height: '450px'
    }).appendTo('body');

    var that = this;

    $('div#cfgModal').on('change', 'input, textarea', function() {
        var index = $(this).data('cfg-index');
        if (index === undefined) {
            return;
        }

        if (!that.config.toggle(index)) {
            that.config.set(index, $(this).val());
        }

        $('button#configSave').prop('disabled', false);
    });

    $('div#cfgModal').on('click', 'button#configSave', function() {
        that.config.save();

        $(this).prop('disabled', true);
    });

    $('#modulelist').on('change', function() {
        var idx = document.getElementById('modulelist').selectedIndex;
        that.loadOptions(idx);
    });

    $('#modulelist').trigger('change');

    // initialize config window
    $('#cfgModal').jqm({ trigger: 'a#icm_enhanced_cfg' });

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
    // Disable on completed lists and list of checked/favs.
    // If a user unchecks smth., the link will show up only after reloading,
    // but it's a rare case.
    if (!$('ol#itemListMovies > li.unchecked').length) {
        return;
    }

    var randomFilm =
        '<span style="float:right; margin-left: 15px">' +
            '<a href="#" id="icme_random_film">Help me pick a film!</a></span>';

    addToMovieListBar(randomFilm);

    var that = this;
    $('#icme_random_film').on('click', function(e) {
        e.preventDefault();
        that.pickRandomFilm();
    });

    // Allow resetting visible movies on /movies/watchlist/ etc. by clicking on tab's label
    var $activeTab = $('.tabMenu > .active');
    if (!$activeTab.find('a').length) {
        $activeTab.on('click', function() {
            $('ol#itemListMovies > li').show();
        });
    }
};

// Displays a random film on a list
RandomFilmLink.prototype.pickRandomFilm = function() {
    // Recalc in case user has checked smth. while on a page
    var $unchecked = $('ol#itemListMovies > li.unchecked'),
        randNum;

    if (!$unchecked.length) {
        return;
    }

    if (this.config.unique) {
        // Generate random numbers
        if (!this.randomNums.length) {
            // Populate randomNums
            for (var i = 0; i < $unchecked.length; i++) {
                this.randomNums.push(i);
            }

            // Shuffle the results for randomness in-place
            shuffle(this.randomNums);
        }

        randNum = this.randomNums.pop();
    } else {
        randNum = Math.floor(Math.random() * $unchecked.length);
    }

    $('ol#itemListMovies > li').hide();
    $($unchecked[randNum]).show();
};

RandomFilmLink.prototype.settings = {
    title: 'Random film link',
    desc: 'Displays "Help me pick a film" link on movie lists (if they have unchecked movies).' +
        '<br>Click on a list tab\'s label to return to full list.',
    index: 'random_film',
    enableOn: ['movieList', 'movieListSpecial'], // movieListGeneral doesn't make sense here
    options: [getDefState(true), {
        name: 'unique',
        desc: 'Unique suggestions (shows each entry only once ' +
              'until every entry has been shown once)',
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
    if (!$('#itemListMovies').length) {
        return;
    }

    var totalItems = parseInt($('li#listFilterMovies').text().match(/\d+/)),
        checks     = parseInt($('#topListMoviesCheckedCount').text().match(/\d+/)),
        statistics = '<span><b>Upcoming awards:</b>',
        abs = this.config.show_absolute;

    var getSpan = function(award, cutoff) {
        var num = Math.ceil(totalItems * cutoff) - checks;
        if (!abs && num <= 0) {
            return '';
        }

        return '<span style="margin-left: 30px">' + award + ': <b>' + num + '</b></span>';
    };

    statistics += getSpan('Bronze', 0.5) + getSpan('Silver', 0.75) +
                  getSpan('Gold', 0.9) + getSpan('Platinum', 1);

    addToMovieListBar(statistics);
};

UpcomingAwardsList.prototype.settings = {
    title: 'Upcoming awards (individual lists)',
    desc: 'Displays upcoming awards on individual lists',
    index: 'ua_list',
    enableOn: ['movieList'],
    options: [getDefState(true), {
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
    if (!$('.listItemToplist').length) {
        return;
    }

    if (this.config.autoload) {
        this.loadAwardData();
        return;
    }

    var loadLink = '<p id="lad_container">' +
        '<a id="load_award_data" href="#">Load upcoming awards for this user</a></p>';

    $('#listOrdering').before(loadLink);

    var that = this;
    $('p#lad_container').on('click', 'a#load_award_data', function(e) {
        e.preventDefault();
        $(e.target).remove();
        that.loadAwardData();
    });
};

UpcomingAwardsOverview.prototype.loadAwardData = function() {
    this.lists = [];
    this.hiddenLists = evalOrParse(gmGetValue('hidden_lists', '[]'));

    this.populateLists();
    this.sortLists();
    this.htmlOut();
};

UpcomingAwardsOverview.prototype.populateLists = function() {
    var $allLists = $('ol#progressall, ol#itemListToplists').children('li'),
        sel = { progress: { rank: 'span.rank', title: 'h3 > a' },
               lists: { rank: 'span.info > strong:first', title: 'h2 > a.title' } },
        // use different selectors depending on page
        curSel = this.matchesPageType('progress') ? sel.progress : sel.lists,
        awardTypes = [['Platinum', 1], ['Gold', 0.9], ['Silver', 0.75], ['Bronze', 0.5]];

    var that = this;
    $allLists.each(function() {
        var $el = $(this),
            countArr = $el.find(curSel.rank).text().match(/\d+/g);

        if (!countArr) {
            return;
        }

        var checks     = parseInt(countArr[0], 10),
            totalItems = parseInt(countArr[1], 10),
            $t         = $el.find(curSel.title),
            listTitle  = $t.attr('title').replace(/^View the | top list$/g, ''),
            listUrl    = $t.attr('href');

        for (var award of awardTypes) {
            var neededForAward = Math.ceil(totalItems * award[1]) - checks;
            if (neededForAward <= 0) {
                break; // the order of awardTypes array is important!
            }

            that.lists.push({ neededForAward, listTitle, listUrl, awardType: award[0] });
        }
    });
};

UpcomingAwardsOverview.prototype.sortLists = function() {
    // sort lists array by least required checks ASC,
    // then by award type if checks are equal DESC, then by list title ASC
    var awardOrder = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
    this.lists.sort(function(a, b) {
        if (a.neededForAward < b.neededForAward) {
            return -1;
        } else if (a.neededForAward > b.neededForAward) {
            return 1;
        } else if (awardOrder[a.awardType] > awardOrder[b.awardType]) {
            return -1;
        } else if (awardOrder[a.awardType] < awardOrder[b.awardType]) {
            return 1;
        } else if (a.listTitle < b.listTitle) {
            return -1;
        } else if (a.listTitle > b.listTitle) {
            return 1;
        }

        return 0;
    });
};

/**
 * Create a function that generates <img> for a hide/unhide button.
 * Using a factory allows to do costly line concat only once
 * and only if this module is attached.
 */
UpcomingAwardsOverview.prototype.getIconFactory = function() {
    var unhideIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAA' +
        'AQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW' +
        '1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjR' +
        'uqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/2' +
        '6gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrE' +
        'h546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8V' +
        'gBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUP' +
        'ujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmH' +
        'vwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaN' +
        'ZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzS' +
        'CwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTk' +
        'SuQmCC',
        hideIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK' +
        'CAYAAACNMs+9AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1h' +
        'Z2VSZWFkeXHJZTwAAADtSURBVHjajFC7DkFREJy9iXg0t+EHRKJDJSqRuIVaJT7AF+jR' +
        '+xuNRiJyS8WlRaHWeOU+kBy7eyKhs8lkJrOzZ3OWzMAD15gxYhB+yzAm0ndez+eYMYLn' +
        'gdkIf2vpSYbCfsNkOx07n8kgWa1UpptNII5VR/M56Nyt6Qq33bbhQsHy6aR0WSyEyEmi' +
        'CG6vR2ffB65X4HCwYC2e9CTjJGGok4/7Hcjl+ImLBWv1uCRDu3peV5eGQ2C5/P1zq4X9' +
        'dGpXP+LYhmYz4HbDMQgUosWTnmQoKKf0htVKBZvtFsx6S9bm48ktaV3EXwd/CzAAVjt+' +
        'gHT5me0AAAAASUVORK5CYII=';

    /**
     * Generate <img> for a hide/unhide button.
     *
     * @param {boolean} hide - true to hide, false to unhide
     * @param {string} listTitle
     */
    var getIcon = function(hide, listTitle) {
        return '<img src="' + (hide ? hideIconData : unhideIconData) + '" ' +
            'alt="' + (hide ? 'Hide ' : 'Unhide ') + 'icon" ' +
            'title="' + (hide ? 'Hide ' : 'Unhide ') + listTitle + '">';
    };

    return getIcon;
};

UpcomingAwardsOverview.prototype.htmlOut = function() {
    var getIcon = this.getIconFactory(),
        listTable =
            '<table id="award_table"><thead><tr id="award_table_head">' +
                '<th>Awards</th><th>Checks</th><th>List title</th><th>(Un)Hide</th>' +
            '</tr></thead><tbody>';

    for (var el of this.lists) {
        var isHidden = this.hiddenLists.indexOf(el.listUrl) !== -1,
            icon = getIcon(!isHidden, el.listTitle);

        listTable += '<tr class="' + (isHidden ? 'hidden-list' : '') +
            '" data-award-type="' + el.awardType + '" data-list-url="' + el.listUrl + '">' +
            '<td style="width: 65px">' + el.awardType + '</td>' +
            '<td style="width: 65px">' + el.neededForAward + '</td>' +
            '<td><div style="height: 28px; overflow: hidden">' +
                '<a class="list-title" href="' + el.listUrl + '">' + el.listTitle + '</a>' +
            '</div></td>' +
            '<td style="width: 70px"><a href="#" class="icm_toggle_list">' + icon + '</a>' +
            '</td></tr>';
    }

    listTable += '</tbody></table>';

    // build the html...
    var toggleUpcomingLink =
        '<p id="ua_toggle_link_container" style="position: relative; ' +
            'left:0; top:0; width: 200px">' +
            '<a id="toggle_upcoming_awards" href="#">' +
                '<span class="_show" style="display: none">Show upcoming awards</span>' +
                '<span class="_hide">Hide upcoming awards</span></a></p>',
        toggleFullLink =
        '<a id="toggle_full_list" href="#">' +
            '<span class="_show">Show full list</span>' +
            '<span class="_hide" style="display: none">Minimize full list</span></a>',
        toggleHiddenLink = '<a id="toggle_hidden_list" href="#">Show hidden</a>';

    var links =
        '<p id="award_display_links" style="position: absolute; ' +
            'right: 0; top: 0; font-weight: bold">' +
            'Display: <a id="display_all" href="#">All</a>, ' +
            '<a id="display_bronze"   class="display_award" href="#">Bronze</a>, ' +
            '<a id="display_silver"   class="display_award" href="#">Silver</a>, ' +
            '<a id="display_gold"     class="display_award" href="#">Gold</a>, ' +
            '<a id="display_platinum" class="display_award" href="#">Platinum</a>, ' +
            toggleFullLink + ', ' + toggleHiddenLink + '</p>';

    var awardContainer =
        '<div id="award_container" class="container" ' +
        'style="position: relative; top: 0; width: 830px; height: 240px; overflow: scroll">' +
            listTable + '</div>';

    var allHtml =
        '<div id="icm_award_html_container" ' +
        'style="z-index: 0; position: relative; margin-top: 0; margin-bottom: 20px">' +
            toggleUpcomingLink + links + awardContainer + '</div>';

    $('#icm_award_html_container, #ua_toggle_link_container').remove();

    if (this.matchesPageType('progress')) {
        $('#listOrdering').before(allHtml);
    } else {
        $('#itemContainer').before(allHtml);
    }

    var $lists = $('#award_table > tbody > tr');

    // hide hidden
    $lists.filter('.hidden-list').hide();

    var that = this;

    $('a.icm_toggle_list').on('click', function(e) {
        e.preventDefault();

        var $parent = $(this).parent().parent(),
            listTitle = $parent.find('.list-title').text().trim(),
            listUrl = $parent.data('list-url'),
            ind = that.hiddenLists.indexOf(listUrl),
            hide = ind === -1;

        if (hide) { // hide list
            that.hiddenLists.push(listUrl);
        } else { // unhide list
            that.hiddenLists.splice(ind, 1);
        }

        $lists.filter(hide ? 'tr' : 'tr.hidden-list')
            .filter(function() { // get all awards with the same url
                return $(this).data('list-url') === listUrl;
            })
            .toggleClass('hidden-list', hide)
            .hide() // = don't show in the current listing
            .find('.icm_toggle_list > img').replaceWith(getIcon(!hide, listTitle));

        // save hidden lists
        gmSetValue('hidden_lists', JSON.stringify(that.hiddenLists));
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

    $('#award_display_links').on('click', 'a.display_award', function(e) {
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
    enableOn: ['listsSpecial', 'progress'],
    options: [getDefState(true), {
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
    function buildCSS(className, color) {
        if (!color.length) {
            return;
        }

        var sel = 'ol#itemListMovies li.' + className;
        return sel + ', ' + sel + ' ul.optionIconMenu ' +
            '{ background-color: ' + color + ' !important; }';
    }

    var listColorsCss =
        buildCSS('favorite', this.config.colors.favorite) +
        buildCSS('watch',    this.config.colors.watchlist) +
        buildCSS('hated',    this.config.colors.disliked);

    gmAddStyle(listColorsCss);
};

ListCustomColors.prototype.settings = {
    title: 'Custom list colors',
    desc: 'Changes entry colors on lists to visually separate ' +
          'your favorites/watchlist/dislikes',
    index: 'list_colors',
    enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch',
        'listsGeneral', 'listsSpecial'],
    options: [getDefState(true), {
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

    // array of top list jQuery elements
    this.$toplists = [];

    // cross-referencing in progress
    this.inProgress = false;

    // current top list's number that is checked
    this.sequenceNumber = 0;
};

ListCrossCheck.prototype.attach = function() {
    if (!$('#itemListToplists').length) {
        return;
    }

    var actions = '<div id="crActions" style="margin-bottom: 18px">' +
        '<button id="cfgListCCActivate">Activate CR</button></div>';

    $('#itemContainer').before(actions);
    var that = this;

    $('div#crActions').on('click', 'button#cfgListCCActivate', function() {
        $(this).prop('disabled', true);
        that.createTab();
        that.activate();
    });

    var customCSS = '<style type="text/css">' +
        'ol#itemListToplists li.icme_listcc_selected, ' +
        'ol#itemListToplists li.icme_listcc_hover, ' +
        '.icme_listcc_selected .progress, .icme_listcc_hover .progress ' +
            '{ background-color: #cccccc !important; } ' +
        'ol#itemListToplists li.icme_listcc_pending, .icme_listcc_pending .progress ' +
            '{ background-color: #ffffb2 !important; }' +
        '</style>';

    $('head').append(customCSS);
};

ListCrossCheck.prototype.activate = function() {
    this.init();
    this.activated = true;
    var that = this;

    $('button#cfgListCCActivate')
        .after('<button id="cfgListCCDeactivate">Deactivate</button>');

    $('div#crActions').on('click', 'button#cfgListCCDeactivate', function() {
        that.deactivate();
        $('button#cfgListCCActivate').prop('disabled', false);
    });

    // ff 3.6 compatibility (ff 3.6 fails to unbind the events in all possible ways)
    if (this.activatedOnce) {
        return;
    }

    $('ol#itemListToplists li').on('click mouseover mouseout', function(e) {
        var activeAndIdle = that.activated && !that.inProgress;
        if (!activeAndIdle) { // ff 3.6 compatibility
            return;
        }

        var $li = $(this);
        // event actions must not work for cloned toplists under the selected tab
        if ($li.hasClass('icme_listcc')) {
            return false; // ff 3.6 compatibility
        }

        var wasSelected = $li.hasClass('icme_listcc_selected');
        if (e.type === 'mouseover' && !wasSelected) {
            $li.addClass('icme_listcc_hover').find('span.percentage').hide();
        } else if (e.type === 'mouseout' && !wasSelected) {
            $li.removeClass('icme_listcc_hover').find('span.percentage').show();
        } else if (e.type === 'click') {
            $li.removeClass('icme_listcc_hover');
            $li.toggleClass('icme_listcc_selected');

            if (wasSelected) { // before click
                $li.addClass('icme_listcc_hover');
            }
        }

        return false; // ff 3.6 compatibility
    });

    this.activatedOnce = true;
};

ListCrossCheck.prototype.deactivate = function() {
    var $selectedToplists = $('li.icme_listcc_selected', 'ul#topLists');

    // if there's still selected top lists, change them back to normal
    $selectedToplists.removeClass('icme_listcc_selected').find('span.percentage').show();

    $('ol#itemListToplists').children('li')
        .removeClass('icme_listcc_selected').removeClass('icme_listcc_hover');
    $('button#icme_listcc_check, button#cfgListCCDeactivate').remove();
    $('li#topListCategoryCCSelected').remove();
    $('button#cfgListCCActivate').prop('disabled', false);

    this.init();
};

/**
 * Check through every selected top list
 */
ListCrossCheck.prototype.check = function() {
    var $toplistCont = $('ol#itemListToplists');

    // make selected top lists normal under the regular tabs
    $toplistCont.children('li.icme_listcc_selected')
        .removeClass('icme_listcc_selected')
        .find('span.percentage').show();

    // get selected top lists
    var $toplists = $toplistCont.children('li.icme_listcc');

    this.inProgress = true;

    // sort selected top lists in ascending order by number of unchecked films
    function getUnchecked(x) {
        var checks = $(x).find('span.info > strong:first').text().split('/');
        return checks[1] - checks[0];
    }

    $toplists.sort(function(a, b) {
        return getUnchecked(a) < getUnchecked(b) ? -1 : 1;
    });

    // make selected toplists highlighted under the selected tab
    $toplists.addClass('icme_listcc_selected').find('span.percentage').hide();

    this.$toplists = $toplists;
    this.getUncheckedFilms(this.$toplists.eq(this.sequenceNumber));
};

/**
 * Get unchecked films from a top list.
 *
 * @param {jQuery} $list - the top list element
 */
ListCrossCheck.prototype.getUncheckedFilms = function($list) {
    var url = $list.find('a').attr('href');
    $list.addClass('icme_listcc_pending');

    var that = this;
    $.get(url, function(response) {
        $list.removeClass('icme_listcc_selected icme_listcc_pending')
            .find('span.percentage').show();

        var filter = that.config.checks ? '' : 'li.unchecked';
        // the site returns html with extra whitespace
        var $unchecked = $($.parseHTML(response)).find('ol#itemListMovies').children(filter);

        that.updateMovies($unchecked);
    });
};

/**
 * Update array of movies.
 *
 * @param {jQuery} $content - unchecked movies (<li> elements) on a top list page
 */
ListCrossCheck.prototype.updateMovies = function($content) {
    this.sequenceNumber += 1;

    // keeps track if at least one movie on the current top list is also found
    //   on all previous top lists (if checking for movies found on all top lists).
    // it's a major optimization that halts the script if there's a top list with 0 matches
    //   especially early on and doesn't go on to check all the rest of the lists wasting time
    var globalToplistMatch = false;

    var showPerfectMatches = this.config.match_all;

    var that = this;
    $content.each(function() {
        var found = false,
            $movie = $(this),
            $movieTitle = $movie.find('h2'),
            title = $movieTitle.text().trim(),
            url = $movieTitle.find('a').attr('href'),
            year = $movieTitle.next('span.info').children('a:first').text();

        for (var movieObj of that.movies) {
            // compare urls as they're guaranteed to be unique
            // in some cases movie title and release year are the same for different movies
            // which results in incorrect top list values
            if (url === movieObj.url) {
                movieObj.count += 1;
                movieObj.jq.find('.rank').html(movieObj.count);
                found = true;
                globalToplistMatch = true;
                break;
            }
        }

        // if a movie wasn't found on previous top lists,
        // add it to the main movies array
        //   only if the script is not checking for matches on all top lists
        //     OR if the script is     checking for matches on all top lists,
        //        but this is just the first top list
        if (!found && (!showPerfectMatches || that.sequenceNumber === 1)) {
            $movie.find('.rank').html('0');
            var itemid = $movie.attr('id');

            // check if owned
            var owned = evalOrParse(gmGetValue('owned_movies', '[]'));
            if (owned.indexOf(itemid) !== -1) {
                $movie.removeClass('notowned').addClass('owned');
            }

            that.movies.push({ title, url, year, count: 1, jq: $movie });
        }
    });

    var hasToplistsLeft = this.sequenceNumber < this.$toplists.length;

    // if finding movies on all selected top lists
    if (showPerfectMatches) {
        // if one or more movies was found on all selected top lists
        if (globalToplistMatch) {
            // if not first top list, extract movies that have been found on all selected top lists
            if (this.sequenceNumber > 1) {
                var cutoff = this.sequenceNumber;
                this.movies = $.grep(this.movies, function(el) {
                    return el.count === cutoff;
                });
            }
        // if didn't find a single match, abort if it's the last or not the first top list
        } else if (this.sequenceNumber > 1 || !hasToplistsLeft) {
            this.movies = [];
            hasToplistsLeft = false; // force output
        }
    }

    // if there's still more top lists
    if (hasToplistsLeft) {
        this.getUncheckedFilms(this.$toplists.eq(this.sequenceNumber));
    } else {
        this.outputMovies();
    }
};

ListCrossCheck.prototype.outputMovies = function() {
    var showPerfectMatches = this.config.match_all;

    if (!showPerfectMatches) {
        var limit = this.config.match_min;

        if (limit > 0) {
            this.movies = $.grep(this.movies, function(el) {
                return el.count >= limit;
            });
        }
    }

    // Sort by checks DESC, then by year ASC, then by title ASC
    this.movies.sort(function(a, b) {
        if (a.count > b.count) {
            return -1;
        } else if (a.count < b.count) {
            return 1;
        } else if (a.year < b.year) {
            return -1;
        } else if (a.year > b.year) {
            return 1;
        } else if (a.title < b.title) {
            return -1;
        } else if (a.title > b.title) {
            return 1;
        }

        return 0;
    });

    if (this.movies.length) {
        var menu = '<ul>';
        this.$toplists.each(function() {
            menu += '<li><b>' + $(this).find('h2').text() + '</b></li>';
        });

        menu += '</ul><ul class="tabMenu tabMenuPush">' +
            '<li class="topListMoviesFilter active">' +
            '<a href="#" title="View all movies">All (' + this.movies.length + ')</a></li>' +
            '<li class="listFilterExportCSV">' +
            '<a href="#" title="Export all movies in CSV format">Export CSV</a></li>' +
            '</ul>';

        // hide previous movie list
        $('#itemListMovies').removeAttr('id').hide();

        $('#itemContainer').after('<ol id="itemListMovies" class="itemList listViewNormal"></ol>');
        $('#itemContainer').after(menu);
        for (var movie of this.movies) {
            $('#itemListMovies').append(movie.jq);
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
                // target only the list below the button (in case there are several)
                $items = $(this).parents('.tabMenu').next('.itemList').children('li');

            $items.each(function() {
                var $item = $(this),
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
            });

            // This should use window instead of unsafeWindow, but
            // FF 39.0.3 broke changing window.location in GM sandbox.
            // When they fix that, either revert back to window
            // or re-use code from ExportLists.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1192821
            // https://github.com/greasemonkey/greasemonkey/issues/2232
            unsafeWindow.location.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(data);
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

    var tab = '<li id="listFilterCRSelected">' +
        '<a href="#" class="icme_listcc">Cross-reference</a>' +
        '<strong style="display: none">Cross-reference</strong></li>';

    var $tlfilter = $('ul.tabMenu', 'div#itemContainer');
    $tlfilter.append(tab);

    var that = this;

    // Modified from ICM source. Make the tab work.
    $('#listFilterCRSelected a').on('click', function() {
        var a = $(this).attr('class'),
            $b = $(this).closest('li');
        $('.tabMenu').find('li').each(function() {
            $(this).removeClass('active');
        });
        $b.addClass('active');

        if (a === 'icme_listcc' && !that.inProgress) {
            var $topListUl = $('ol#itemListToplists');
            $topListUl.children('li.icme_listcc').remove();

            var $topLists = $topListUl.children('li.icme_listcc_selected').clone();

            $topLists
                .removeClass('imdb critics prizes website institute misc icme_listcc_selected')
                .addClass('icme_listcc').find('span.percentage').show();

            $topListUl.append($topLists);

            var selectedTwoOrMore = $('li.icme_listcc', 'ol#itemListToplists').length >= 2;
            if (selectedTwoOrMore && $('button#icme_listcc_check').length === 0) {
                var btn = '<button id="icme_listcc_check">Cross-reference</button>';

                $('div#crActions').append(btn);

                $('button#icme_listcc_check').on('click', function() {
                    $(this).prop('disabled', true);

                    that.check();
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
            } else if (!selectedTwoOrMore && $('button#icme_listcc_check').length === 1) {
                $('button#icme_listcc_check').remove();
            }
        }

        $b = $('ol#itemListToplists');
        $b.find('li').hide();
        $b.find('li.' + a).show();

        return false;
    });
};

ListCrossCheck.prototype.settings = {
    title: 'List cross-reference',
    desc: 'Cross-reference lists to find what films they share',
    index: 'list_cross_ref',
    enableOn: ['listsGeneral', 'listsSpecial'],
    options: [getDefState(true), {
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
    if (this.config.list_tags) {
        // /lists/ and /movies/<title>/rankings/ have different structure
        gmAddStyle('ol#itemListToplists.listViewNormal > li > .info:last-child' + ', ' +
                   'ol#itemListToplists > li > .tagList ' +
                   '{ display: none !important; }');
    }

    if (this.config.movie_tags) {
        gmAddStyle('ol#itemListMovies.listViewNormal > li > .tagList ' +
                   '{ display: none !important; }');
    }

    if (this.config.show_hover) {
        gmAddStyle(
            'ol#itemListToplists.listViewNormal > li:hover > .info:last-child' + ', ' +
            'ol#itemListToplists > li:hover > .tagList' + ', ' +
            'ol#itemListMovies.listViewNormal > li:hover > .tagList ' +
                '{ display: block !important; }');
    }
};

HideTags.prototype.settings = {
    title: 'Hide tags',
    desc: 'Hides tags on movie lists and lists of lists',
    index: 'hide_tags',
    // ICM bug: movieListGeneral and movieSearch never have tags
    enableOn: ['listsGeneral', 'listsSpecial', 'listsSearch',
        'movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch', 'movieRankings'],
    options: [getDefState(false), {
        name: 'list_tags',
        frontDesc: 'Hide on: ',
        desc: 'lists',
        type: 'checkbox',
        inline: true,
        default: true
    }, {
        name: 'movie_tags',
        desc: 'movies',
        type: 'checkbox',
        inline: true,
        default: true
    }, {
        name: 'show_hover',
        desc: 'Show tags when moving the cursor over a movie or a list',
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
        $('#topList').append('<div id="orderByAndView" ' +
            'style="z-index:200; position:absolute; top:30px; right:0; width:300px; height:20px">');
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
    enableOn: ['movieList'],
    options: [getDefState(false)]
};

// Inherit methods from BaseFeature
Owned.prototype = Object.create(BaseFeature.prototype);
Owned.prototype.constructor = Owned;

function Owned(config) {
    BaseFeature.call(this, config);
}

Owned.prototype.attach = function() {
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
        $('#topList').append('<div id="orderByAndView" ' +
            'style="z-index:200; position:absolute; top:30px; right:0; width:300px; height:20px">');
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
    enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch',
        'movie', 'movieRankings'],
    options: [getDefState(false), {
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
    if (this.config.autoload) {
        this.load();
        return;
    }

    // create link
    var link = '<span style="float: right; margin-left: 15px">' +
        '<a id="icme_large_posters" href="#">Large posters</a></span>';

    addToMovieListBar(link);

    var that = this;
    $('#icme_large_posters').on('click', function(e) {
        e.preventDefault();
        that.load();
    });
};

LargeList.prototype.load = function() {
    if (this.loaded) {
        return;
    }

    this.loaded = true;

    // make sure normal view is enabled
    this.enableNormalView();

    var root = '#itemListMovies.listViewNormal',
        style =
        root + ' > .listItem ' +
            '{ float:left; width: 255px; } ' +
        root + ' .listItem .listImage ' +
            '{ float:none; width: 230px; height: 305px; left:-18px; top:-18px; margin:0; } ' +
        root + ' .listImage a ' +
            '{ width:100%; height:100%; background: url("/images/dvdCover.png") ' +
            'no-repeat scroll center center transparent; } ' +
        root + ' .listImage .coverImage ' +
            '{ width:190px; height:258px; top:21px; left: 19px; right:auto; } ' +
        root + ' .listItem .rank ' +
            '{ top: 15px; position:absolute; height:auto; width:65px; ' +
            'right:0; margin:0; font-size:30px; } ' +
        root + ' .listItem .rank .positiondifference span ' +
            '{ font-size: 12px; } ' +
        root + ' .listItem h2 ' +
            '{ z-index:11; font-size:14px; width:100%; margin:-30px 0 0 0; } ' +
        root + ' .listItem .info ' +
            '{ font-size:12px; width:100%; height:auto; line-height:16px; margin-top:4px; } ' +
        root + ' .checkbox ' +
            '{ top:85px; right:12px; } ' +
        root + ' .optionIconMenu ' +
            '{ top:120px; right:20px; } ' +
        root + ' .optionIconMenu li ' +
            '{ display: block; } ' +
        root + ' .optionIconMenuCheckbox ' +
            '{ right:20px; }' +
        '#itemListMovies.listViewCompact > .listItem' +
            '{ height: auto; }';

    style = style.replace(/;/g, ' !important;');

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
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIA' +
            'AACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMA' +
            'AA7DAcdvqGQAAAAMSURBVBhXY5j8rA8ABBcCCCnPKCcAAAAASUVORK5CYII=';
        img.className = 'coverImage';
        img.setAttribute('data-original', cururl);
        $c[i].parentNode.appendChild(img);
    }

    $('img.coverImage').lazyload({ threshold: 200 });
    this.adjustHeights(); // tags and long titles can increase item's height
};

LargeList.prototype.enableNormalView = function() {
    var $normalViewSwitch = $('#listViewNormal').find('a');
    if (!$normalViewSwitch.hasClass('active')) {
        // copied from ICM source code
        $('#listViewCompact').find('a').removeClass('active');
        $normalViewSwitch.addClass('active');
        $('ol.itemList')
            .removeClass('listViewCompact')
            .addClass('listViewNormal');
    }
};

LargeList.prototype.adjustHeights = function() {
    $('.listItemMovie:nth-child(3n-2)').each(function() {
        var $t = $(this),
            $t2 = $t.next(),
            $t3 = $t2.next(),
            maxHeight = Math.max($t.height(), $t2.height(), $t3.height());
        $t.add($t2).add($t3).height(maxHeight);
    });
};

LargeList.prototype.settings = {
    title: 'Large posters',
    desc: 'Display large posters on individual lists (large posters are lazy loaded)',
    index: 'large_lists',
    enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial'],
    options: [getDefState(true), {
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
    if (this.config.single_col) {
        gmAddStyle('.itemList .listItem.listItemProgress { float: none !important; }');
    }

    var order = this.config.order === true ? 'desc' : 'asc';
    this.rearrange(order, 'all');

    var that = this;
    $('#progressFilter a').not('#progressFilter-all').one('click', function() {
        var section = $(this).attr('id').split('-')[1];
        that.rearrange(order, section);
    });
};

ListOverviewSort.prototype.rearrange = function(order, section) {
    var $toplistList = $('#progress' + section),
        $toplistItems = $toplistList.children('li').detach(),
        isInterweaved = true;

    if (this.config.hide_imdb && section === 'all') {
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
        var lookupMap = toplistArr.map(function(item, index) {
            var width = $(item).find('span.progress').css('width').replace('px', '');
            return { index, value: parseFloat(width) };
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
    var even = [],
        odd  = [];
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
    enableOn: ['progress'],
    options: [getDefState(false), {
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

    this.$block = $('#itemListToplists');
    this.sep = '<li class="groupSeparator"><br><hr><br></li>';
    // multiline regex that leaves only list name, excl. a common beginning and parameters
    this.reURL = /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:icheckmovies.com)?\/?(?:lists)?\/?([^\s\?]+\/)(?:\?.+)?[ \t]*$/gm;
}

ListsTabDisplay.prototype.attach = function() {
    var onMoviePage = this.matchesPageType('movieRankings'),
        _c = this.config;

    if (onMoviePage) {
        var lists = this.$block.children();

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
            for (var group of ['group1', 'group2']) {
                var stored = _c[group];
                if (typeof stored === 'string') {
                    // Parse textarea content
                    console.log('Parsing ListsTabDisplay group', group);
                    stored = stored.trim().replace(this.reURL, '$1').split('\n');
                    _c[group] = stored;
                    this.globalConfig.save();
                }

                var $personal = this.getLists(stored);
                this.move($personal);
            }
        }

        if (_c.sort_filmos) {
            var $filmos = lists.filter(function() {
                return $(this).text().toLowerCase().indexOf('filmography') >= 0;
            });
            this.move($filmos);
        }

        // visual fix for edge cases when all lists are moved
        lists.last().filter('.groupSeparator').hide();
    } else if (_c.redirect) { // = if on a list page
        var $linksToLists = $('.listItemMovie > .info > a:nth-of-type(2)');

        $linksToLists.each(function() {
            var $link = $(this),
                url = $link.attr('href').replace('?tags=user:icheckmovies', '');
            $link.attr('href', url);
        });
    }
};

ListsTabDisplay.prototype.move = function(lists) {
    if (!lists.length) {
        return;
    }

    var $target = this.$block.find('li.groupSeparator').last();
    if ($target.length) {
        $target.after(lists, this.sep);
    } else {
        this.$block.prepend(lists, this.sep);
    }
};

ListsTabDisplay.prototype.getLists = function(listIDs) {
    if (!listIDs.length) {
        return [];
    }

    var $selected = this.$block.children().filter(function() {
        var href = $(this).find('a.title').attr('href');
        return href && $.inArray(href.substring(7), listIDs) !== -1; // sep matches too
    });
    return $selected;
};

ListsTabDisplay.prototype.settings = {
    title: 'Lists tab display',
    desc: 'Organize movie info tab with all lists (/movies/*/rankings/, ' +
          '<a href="/movies/pulp+fiction/rankings/">example</a>)',
    index: 'lists_tab_display',
    enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial',
        'movieRankings', 'movieSearch'],
    options: [getDefState(true), {
        name: 'redirect',
        desc: 'Redirect "in # lists" movie links to "All" lists tab',
        type: 'checkbox',
        default: true
    }, {
        name: 'sort_official',
        frontDesc: 'Auto-sort (move to the top): ',
        desc: 'official lists',
        type: 'checkbox',
        inline: true,
        default: true
    }, {
        name: 'sort_filmos',
        desc: 'filmographies',
        type: 'checkbox',
        inline: true,
        default: true
    }, {
        name: 'sort_groups',
        desc: 'lists from user defined groups',
        type: 'checkbox',
        inline: true,
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
    var _c = this.config,
        sep = _c.delimiter;

    $('.optionExport').one('click', function() {
        if (sep !== ',' && sep !== ';') {
            sep = '\t';
        }

        var data = ['rank', 'title', 'aka', 'year', 'official_toplists',
            'checked', 'favorite', 'dislike', 'imdb'].join(sep) + sep + '\n';

        function encodeField(field) {
            return field.indexOf('"') !== -1 || field.indexOf(sep) !== -1 ?
                   '"' + field.replace(/"/g, '""') + '"' :
                   field;
        }

        $('#itemListMovies > li').each(function() {
            var $item = $(this),
                rank = $item.find('.rank').text().trim().replace(/ .+/, ''),
                title = encodeField($item.find('h2>a').text()),
                aka = encodeField($item.find('.info > em').text()),
                year = $item.find('.info a:first').text(),
                toplists = parseInt($item.find('.info a:nth-of-type(2)').text(), 10),
                checked = $item.hasClass('checked') ? 'yes' : 'no',
                isFav = $item.hasClass('favorite') ? 'yes' : 'no',
                isDislike = $item.hasClass('hated') ? 'yes' : 'no',
                imdburl = $item.find('.optionIMDB').attr('href'),
                line = [rank, title, aka, year, toplists, checked,
                    isFav, isDislike, imdburl].join(sep) + sep + '\n';
            data += line;
        });

        // BOM with ; or , as separator and without sep= - for Excel
        var bom = _c.bom ? '\uFEFF' : '',
            dataURI = 'data:text/csv;charset=utf-8,' + bom + encodeURIComponent(data),
            filename = $('#topList>h1').text().trim() || $('#listTitle > h1').text().trim();
        // link swapping with a correct filename - http://caniuse.com/download
        $(this).attr('href', dataURI).attr('download', filename + '.csv');

        // after changing URL jQuery fires a default click event
        // on the link user clicked on, and loads dataURI as URL (!)
        // I could've used preventDefault + change window.location.href,
        // but that way the file wouldn't have a correct filename
    });
};

ExportLists.prototype.settings = {
    title: 'Export lists',
    desc: 'Download any list as .csv (doesn\'t support search results). ' +
          'Emulates the paid feature, so don\'t enable it if you have a paid account',
    index: 'export_lists',
    enableOn: ['movieList', 'movieListSpecial'],
    options: [getDefState(false), {
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
    var style = 'float: left; margin-right: 0.5em',
        attr = { style, text: 'Load stats', id: 'icme_req_for_top', href: '#' },
        // can't pass the value directly in case of user changing it and not reloading
        $loadLink = $('<a>', attr).click({ cfg: this.config }, this.addStats),
        $spanElem = $('<span>', { style, text: ' | ' });

    $('#listOrderingWrapper').prepend($loadLink, $spanElem);
};

ProgressTopX.prototype.addStats = function(event) {
    var targetPage = parseInt(event.data.cfg.target_page, 10), // * 25 = target rank
        $lists = $('.itemListCompact[id^="progress"]:visible span.rank a');

    $lists.each(function() {
        var $list = $(this),
            oldText = $list.text(),
            curRank = oldText.match(/\d+/);

        if (curRank < targetPage * 25) {
            return;
        }

        var url = $list.attr('href').replace(/=.*$/, '=' + targetPage),
            progress = parseInt($list.parent().text().match(/\d+/), 10);

        $.get(url, function(data) {
            data = data.match(/\d+<\/strong> checks in this list,/g).pop().match(/\d+/);
            if (data) {
                var minchecks = parseInt(data[0], 10),
                    dif = minchecks - progress;
                $list.text(oldText + ' - ' + minchecks + ' req - ' + dif + ' dif');
                $list.attr('href', url);
            }
        });
    });

    return false; // prevents auto-scrolling to the top
};

ProgressTopX.prototype.settings = {
    title: 'Progress top X',
    desc: 'Find out how many checks you need to get into Top 25/50/100/1000/...',
    index: 'progress_top_x',
    enableOn: ['progress'],
    options: [getDefState(true), {
        name: 'target_page',
        desc: 'Ranking page you want to be on (page x 25 = rank)',
        type: 'textinput',
        default: '40'
    }]
};

/**
 * Main application
 * Initialize, register and load modules
 */
function Enhanced(globalConfig) {
    this.modules = [];
    this.config = globalConfig;
    this.configWindow = new ConfigWindow(globalConfig);
}

Enhanced.prototype.register = function(Module) {
    var module = new Module(this.config);
    this.modules.push(module);
    this.configWindow.addModule(module.settings);
};

Enhanced.prototype.load = function() {
    for (var m of this.modules) {
        if (m.matchesUrl()) {
            if (m.config.enabled) {
                console.log('Attaching ' + m.constructor.name);
                m.attach();
            } else {
                console.log('Skipping ' + m.constructor.name);
            }
        }
    }

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
for (var m of useModules) {
    app.register(m);
}

app.load();
console.log('ICM Enhanced is ready.');
