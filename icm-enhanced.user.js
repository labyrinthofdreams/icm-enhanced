// ==UserScript==
// @name           iCheckMovies Enhanced
// @namespace      iCheckMovies
// @description    Adds new features to enhance the iCheckMovies user experience
// @version        1.8.0
// @include        http://icheckmovies.com*
// @include        http://www.icheckmovies.com*
// @include        https://icheckmovies.com*
// @include        https://www.icheckmovies.com*
// @require        https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
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

'use strict';

// ----- Utils -----

/* eslint-disable camelcase */
const gmInfo = GM_info;
const gmSetValue = GM_setValue;
const gmGetValue = GM_getValue;
const gmAddStyle = GM_addStyle;
const gmGetResourceText = GM_getResourceText;
/* eslint-enable camelcase */

// ----- Interacting with ICM -----

// mutually exclusive regexes for matching page type
const reICM = Object.freeze({
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
        /icheckmovies.com\/profiles\/progress\//,
});

const addToMovieListBar = htmlStr => {
    let $container = $('#icme_list_container');
    if (!$container.length) {
        const htmlWrapped = `
            <div id="icme_list_container" style="height: 35px; position: relative">
                ${htmlStr}
            </div>`;
        $container = $(htmlWrapped);

        $('#topList, #listTitle') // movieList and movieListGeneral+Special use different headers
            .nextAll('.container').last()
            .before($container);
    } else {
        $container.append(htmlStr);
    }
};

// ----- Base classes and config windows -----

class BaseModule {
    constructor(globalCfg) {
        this.metadata = null; // check any module for required fields
        this.config = null; // will be created after the module has been registered
        this.globalCfg = globalCfg; // allows modules to use Save/Set/Get
    }

    // Create a necessary metadata.options item for if a module should be loaded by default.
    static getStatus(isEnabled) {
        return {
            id: 'enabled',
            desc: 'Enabled',
            type: 'checkbox',
            default: isEnabled,
        };
    }

    /**
     * Check if the current page matches at least one of given page types.
     *
     * @param {(string|string[])} keys - A key of reICM, or an array of keys
     * @returns {boolean} true if the current page matches any of specified regexes
     */
    static matchesPageType(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        const matchUrl = regex => regex.test(window.location.href);
        return BaseModule.getRegexes(keys).some(matchUrl);
    }

    static getRegexes(arrOfKeys) {
        return arrOfKeys.map(key => {
            if (reICM[key] === undefined) {
                throw new TypeError(`Invalid icm-regex name: ${key}`);
            }

            return reICM[key];
        });
    }

    isOnSupportedPage() {
        return BaseModule.matchesPageType(this.metadata.enableOn);
    }

    // Add module options to the global config;
    // Keep loaded values, delete outdated options, add new options
    syncGlobalCfg() {
        const { id } = this.metadata;
        const config = {};
        for (const opt of this.metadata.options) {
            config[opt.id] = this.globalCfg.get(`${id}.${opt.id}`) ?? opt.default;
        }

        this.config = config;
        this.globalCfg.data[id] = config;
    }
}

class GlobalCfg {
    constructor() {
        // test:
        // ['1', '1.7', '1.7.1', '1.7.1.1', '1.7.1.1.1'].map(verToNumber) ===
        // [1000, 1700, 1710, 1711, 1711]
        const verToNumber = str => Number(`${str.replace(/\./g, '')}0000`.slice(0, 4));

        this.data = {
            script_info: { // script config
                version: gmInfo.script.version, // dot-separated string
                revision: verToNumber(gmInfo.script.version), // 4-digit number
            },
        };

        const oldcfg = JSON.parse(gmGetValue('icm_enhanced_cfg'));
        if (!oldcfg) return;

        const oldInfo = oldcfg.script_info;
        const newInfo = this.data.script_info;
        const isUpdated = oldInfo.revision !== newInfo.revision;
        // Rewrite script_info in the loaded config (no need to keep outdated values)
        oldcfg.script_info = newInfo;
        this.data = oldcfg;

        if (isUpdated) {
            console.log(`Updating to ${newInfo.revision}`);
            this.save();
        }
    }

    save() {
        // console.log('Saving config', this.data); // debug
        gmSetValue('icm_enhanced_cfg', JSON.stringify(this.data));
    }

    // Get a config value by a dot-separated path
    get(path) {
        return path.split('.').reduce((prev, curr) => prev && prev[curr], this.data);
    }

    // Set a config value by a dot-separated path
    set(path, value) {
        const parts = path.split('.');
        const last = parts.pop();
        let obj = this.data;
        for (const part of parts) {
            obj[part] = obj[part] ?? {};
            obj = obj[part];
        }

        obj[last] = value;
    }

    // Set false to true and vice versa
    toggle(path) {
        const val = this.get(path);
        let changeVal;

        if (val === true || val === false) {
            changeVal = !val;
        } else if (val === 'asc' || val === 'desc') {
            changeVal = val === 'asc' ? 'desc' : 'asc';
        } else {
            return false; // Couldn't toggle a value
        }

        this.set(path, changeVal);
        return true; // Value toggled
    }
}

class ConfigWindow {
    constructor(globalCfg) {
        this.globalCfg = globalCfg;
        this.modules = [];
    }

    addModule(metadata) {
        if (!this.modules.some(m => m.title === metadata.title)) {
            this.modules.push(metadata);
        }
    }

    // eslint-disable-next-line complexity
    loadOptions(idx) {
        const m = this.modules[idx];
        let str = `<p>${m.desc}</p>`;
        let needsExtraInit = false;

        for (const opt of m.options) {
            const path = `${m.id}.${opt.id}`;
            let optValue = this.globalCfg.get(path); // always up to date
            const pathAttr = `data-cfg-path="${path}"`;

            if (opt.type === 'checkbox') {
                const checkbox = `
                    <label>
                        <input type="checkbox" ${pathAttr}
                            ${optValue ? 'checked="checked"' : ''}
                            title="default: ${opt.default ? 'yes' : 'no'}">
                        ${opt.desc}
                    </label>`;
                str += `<p${opt.inline ? ' class="inline-opt"' : ''}>${opt.frontDesc || ''}${checkbox}</p>`;
            } else if (opt.type === 'textinput') {
                str += `<p>${opt.desc}:<input type="text" ${pathAttr} value="${optValue}"
                                            title="default: ${opt.default}"></p>`;
            } else if (opt.type === 'textarea') {
                // optValue can be a string (until a module parses it) or an array (after)
                if ($.isArray(optValue)) {
                    optValue = optValue.join('\n');
                }

                str += `
                    <p>
                        <span style="vertical-align: top; margin-right: 5px">${opt.desc}:</span>
                        <textarea rows="4" cols="70" ${pathAttr}>${optValue}</textarea>
                    </p>`;
            } else if (opt.type === 'textinputcolor') {
                str += `<p>${opt.desc}:<input type="text" class="colorpickertext" ${pathAttr}
                                            value="${optValue}" title="default: ${opt.default}">
                                    <input type="text" class="colorpicker"></p>`;
                needsExtraInit = true;
            }
        }

        $('#module_settings').html(str);

        if (needsExtraInit) {
            ConfigWindow.initColorPickers();
        }
    }

    static initColorPickers() {
        $('.colorpicker').each(function () {
            const $t = $(this);
            $t.spectrum({
                color: $t.prev().val(),
                change(color) {
                    const $prev = $t.prev();
                    $prev.val(color.toHexString());
                    $prev.trigger('change');
                },
            });
        });
        $('.colorpickertext').on('change input paste', function () {
            $(this).next().spectrum('set', $(this).val());
        });
    }

    build() {
        // Sort module list by title
        this.modules.sort((a, b) => (a.title > b.title ? 1 : -1));

        // Create and append a new item in the drop down menu under your username
        const cfgLink = '<li><a id="icm_enhanced_cfg" href="#"' +
            'title="Configure iCheckMovies Enhanced script options">ICM Enhanced</a></li>';

        $('ul#profileOptions').append(cfgLink);

        // Custom CSS for jqmodal
        const customCSS = `
            .jqmWindow {
                display: none;
                position: absolute;
                font-family: verdana, arial, sans-serif;
                background-color: #fff;
                color: #000;
                padding: 12px 30px;
            }
            .jqmWindow hr {
                border: 0;
                height: 1px;
                width: 100%;
                background-color: #aaa;
                margin: 7px 0px;
            }
            .jqmOverlay { background-color: #000; }
            div.icme_cfg_feature { margin-bottom: 15px; }
            span.has_settings:hover { text-decoration: underline; }
            div.icme_cfg_feature > div.icme_cfg_settings {
                display: none;
                margin-left: 22px;
                margin-top: 10px;
            }
            span.icme_feature_title { font-weight: bold; }
            input[type=text] { font-family: monospace }
            #module_settings { margin: 10px 0; }
            #module_settings > p { margin-bottom: 0.5em; }
            #module_settings > p.inline-opt { display: inline-block; margin-right: 5px }
            #module_settings input { margin: 0px 3px; }
            #configSave {
                position: absolute;
                bottom:15px;
                left: 30px
            }
        `;

        gmAddStyle(customCSS);

        let moduleList = '<select id="modulelist" name="modulelist">';
        for (const m of this.modules) {
            moduleList += `<option>${m.title}</option>`;
        }

        moduleList += '</select>';

        // HTML for the main jqmodal window
        const ver = this.globalCfg.data.script_info.version;
        const cfgMainHtml = `
            <div class="jqmWindow" id="cfgModal">
                <h3 style="color:#bbb">iCheckMovies Enhanced ${ver} configuration</h3>
            ${moduleList}
            <hr>
            <div id="module_settings"></div>
            <button id="configSave">Save settings</button>
            </div>
        `;

        // style & append config window
        $(cfgMainHtml).css({
            top: '17%', left: '50%', marginLeft: '-400px', width: '800px', height: '450px',
        }).appendTo('body');

        const that = this;

        $('div#cfgModal').on('change', 'input, textarea', function () {
            const path = $(this).data('cfg-path');
            if (path === undefined) {
                return;
            }

            if (!that.globalCfg.toggle(path)) {
                that.globalCfg.set(path, $(this).val());
            }

            $('button#configSave').prop('disabled', false);
        });

        $('div#cfgModal').on('click', 'button#configSave', function () {
            that.globalCfg.save();

            $(this).prop('disabled', true);
        });

        $('#modulelist').on('change', () => {
            const idx = document.getElementById('modulelist').selectedIndex;
            that.loadOptions(idx);
        });

        $('#modulelist').trigger('change');

        // initialize config window
        $('#cfgModal').jqm({ trigger: 'a#icm_enhanced_cfg' });

        // Initialize spectrum plugin
        gmAddStyle(gmGetResourceText('spectrumCss'));
    }
}

// ----- Modules -----

class RandomFilmLink extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Random film link',
            desc: 'Displays "Help me pick a film" link on movie lists (if they have unchecked movies).' +
                '<br>Click on a list tab\'s label to return to full list.',
            id: 'random_film',
            enableOn: ['movieList', 'movieListSpecial'], // movieListGeneral doesn't make sense here
            options: [BaseModule.getStatus(true), {
                id: 'unique',
                desc: 'Unique suggestions (shows each entry only once ' +
                    'until every entry has been shown once)',
                type: 'checkbox',
                default: true,
            }],
        };

        this.randomNums = [];
    }

    // Creates an element and inserts it into the DOM
    attach() {
        // Disable on completed lists and list of checked/favs.
        // If a user unchecks smth., the link will show up only after reloading,
        // but it's a rare case.
        if (!$('ol#itemListMovies > li.unchecked').length) {
            return;
        }

        const randomFilm =
            '<span style="float:right; margin-left: 15px">' +
            '<a href="#" id="icme_random_film">Help me pick a film!</a></span>';

        addToMovieListBar(randomFilm);

        const that = this;
        $('#icme_random_film').on('click', e => {
            e.preventDefault();
            that.pickRandomFilm();
        });

        // Allow resetting visible movies on /movies/watchlist/ etc. by clicking on tab's label
        const $activeTab = $('.tabMenu > .active');
        if (!$activeTab.find('a').length) {
            $activeTab.on('click', () => {
                $('ol#itemListMovies > li').show();
            });
        }
    }

    // Displays a random film on a list
    pickRandomFilm() {
        // Recalc in case user has checked smth. while on a page
        const $unchecked = $('ol#itemListMovies > li.unchecked');
        let randNum;

        if (!$unchecked.length) {
            return;
        }

        if (this.config.unique) {
            // Generate random numbers
            if (!this.randomNums.length) {
                // Populate randomNums
                for (let i = 0; i < $unchecked.length; i++) {
                    this.randomNums.push(i);
                }

                // Shuffle the results for randomness in-place
                RandomFilmLink.shuffle(this.randomNums);
            }

            randNum = this.randomNums.pop();
        } else {
            randNum = Math.floor(Math.random() * $unchecked.length);
        }

        $('ol#itemListMovies > li').hide();
        $($unchecked[randNum]).show();
    }

    // https://stackoverflow.com/a/12646864/6270692
    static shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }

        return array;
    }
}

class UpcomingAwardsList extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Upcoming awards (individual lists)',
            desc: 'Displays upcoming awards on individual lists',
            id: 'ua_list',
            enableOn: ['movieList'],
            options: [BaseModule.getStatus(true), {
                id: 'show_absolute',
                desc: 'Display negative values',
                type: 'checkbox',
                default: true,
            }],
        };
    }

    attach() {
        if (!$('#itemListMovies').length) {
            return;
        }

        const totalItems = Number($('li#listFilterMovies').text().match(/\d+/));
        const checks = Number($('#topListMoviesCheckedCount').text().match(/\d+/));
        let statistics = '<span><b>Upcoming awards:</b>';
        const abs = this.config.show_absolute;

        const getSpan = function (award, cutoff) {
            const num = Math.ceil(totalItems * cutoff) - checks;
            if (!abs && num <= 0) {
                return '';
            }

            return `<span style="margin-left: 30px">${award}: <b>${num}</b></span>`;
        };

        statistics += getSpan('Bronze', 0.5) + getSpan('Silver', 0.75) +
            getSpan('Gold', 0.9) + getSpan('Platinum', 1);

        addToMovieListBar(statistics);
    }
}

class UpcomingAwardsOverview extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Upcoming awards overview',
            desc: 'Displays upcoming awards on progress page',
            id: 'ua',
            enableOn: ['listsSpecial', 'progress'],
            options: [BaseModule.getStatus(true), {
                id: 'autoload',
                desc: 'Autoload',
                type: 'checkbox',
                default: true,
            }],
        };

        this.lists = [];
        this.hiddenLists = [];
    }

    attach() {
        if (!$('.listItemToplist').length) {
            return;
        }

        if (this.config.autoload) {
            this.loadAwardData();
            return;
        }

        const loadLink = `
            <p id="lad_container">
                <a id="load_award_data" href="#">Load upcoming awards for this user</a>
            </p>`;

        $('#listOrdering').before(loadLink);

        const that = this;
        $('p#lad_container').on('click', 'a#load_award_data', e => {
            e.preventDefault();
            $(e.target).remove();
            that.loadAwardData();
        });
    }

    loadAwardData() {
        this.lists = [];
        this.hiddenLists = JSON.parse(gmGetValue('hidden_lists', '[]'));

        this.populateLists();
        this.sortLists();
        this.htmlOut();
    }

    populateLists() {
        const $allLists = $('ol#progressall, ol#itemListToplists').children('li');
        const sel = {
            progress: { rank: 'span.rank', title: 'h3 > a' },
            lists: { rank: 'span.info > strong:first', title: 'h2 > a.title' },
        };
        // use different selectors depending on page
        const curSel = UpcomingAwardsOverview.matchesPageType('progress') ? sel.progress : sel.lists;
        const awardTypes = [['Platinum', 1], ['Gold', 0.9], ['Silver', 0.75], ['Bronze', 0.5]];

        const that = this;
        $allLists.each(function () {
            const $el = $(this);
            const countArr = $el.find(curSel.rank).text().match(/\d+/g);

            if (!countArr) {
                return;
            }

            const checks = parseInt(countArr[0], 10);
            const totalItems = parseInt(countArr[1], 10);
            const $t = $el.find(curSel.title);
            const listTitle = $t.attr('title').replace(/^View the | top list$/g, '');
            const listUrl = $t.attr('href');

            for (const [awardType, threshold] of awardTypes) {
                const neededForAward = Math.ceil(totalItems * threshold) - checks;
                if (neededForAward <= 0) {
                    break; // the order of awardTypes array is important!
                }

                that.lists.push({ neededForAward, listTitle, listUrl, awardType });
            }
        });
    }

    sortLists() {
        // sort lists array by least required checks ASC,
        // then by award type if checks are equal DESC, then by list title ASC
        const awardOrder = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
        this.lists.sort((a, b) => {
            /* eslint-disable no-else-return */
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
            /* eslint-enable no-else-return */

            return 0;
        });
    }

    // Create a function that generates <img> for a hide/unhide button.
    // Using a factory allows to do costly line concat only once
    // and only if this module is attached.
    static getIconFactory() {
        const unhideIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAA' +
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
            'SuQmCC';
        const hideIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK' +
            'CAYAAACNMs+9AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1h' +
            'Z2VSZWFkeXHJZTwAAADtSURBVHjajFC7DkFREJy9iXg0t+EHRKJDJSqRuIVaJT7AF+jR' +
            '+xuNRiJyS8WlRaHWeOU+kBy7eyKhs8lkJrOzZ3OWzMAD15gxYhB+yzAm0ndez+eYMYLn' +
            'gdkIf2vpSYbCfsNkOx07n8kgWa1UpptNII5VR/M56Nyt6Qq33bbhQsHy6aR0WSyEyEmi' +
            'CG6vR2ffB65X4HCwYC2e9CTjJGGok4/7Hcjl+ImLBWv1uCRDu3peV5eGQ2C5/P1zq4X9' +
            'dGpXP+LYhmYz4HbDMQgUosWTnmQoKKf0htVKBZvtFsx6S9bm48ktaV3EXwd/CzAAVjt+' +
            'gHT5me0AAAAASUVORK5CYII=';

        // Generate <img> for a hide/unhide button.
        const getIcon = (hide, listTitle) =>
            `<img src="${hide ? hideIconData : unhideIconData}"
                alt="${hide ? 'Hide' : 'Unhide'} icon"
                title="${hide ? 'Hide' : 'Unhide'} ${listTitle}">`;

        return getIcon;
    }

    htmlOut() {
        const getIcon = UpcomingAwardsOverview.getIconFactory();
        let listTable = `
            <table id="award_table">
                <thead>
                    <tr id="award_table_head">
                        <th>Awards</th>
                        <th>Checks</th>
                        <th>List title</th>
                        <th>(Un)Hide</th>
                    </tr>
                </thead>
                <tbody>`;

        for (const el of this.lists) {
            const isHidden = this.hiddenLists.indexOf(el.listUrl) !== -1;
            const icon = getIcon(!isHidden, el.listTitle);

            listTable += `
                <tr class="${isHidden ? 'hidden-list' : ''}" data-award-type="${el.awardType}"
                        data-list-url="${el.listUrl}">
                    <td style="width: 65px">${el.awardType}</td>
                    <td style="width: 65px">${el.neededForAward}</td>
                    <td>
                        <div style="height: 28px; overflow: hidden">
                            <a class="list-title" href="${el.listUrl}">${el.listTitle}</a>
                        </div>
                    </td>
                    <td style="width: 70px">
                        <a href="#" class="icm_toggle_list">${icon}</a>
                    </td>
                </tr>`;
        }

        listTable += '</tbody></table>';

        const toggleUpcomingLink = `
            <p id="ua_toggle_link_container" style="position: relative; left: 0; top: 0; width: 200px">
                <a id="toggle_upcoming_awards" href="#">
                    <span class="_show" style="display: none">Show upcoming awards</span>
                    <span class="_hide">Hide upcoming awards</span>
                </a>
            </p>`;
        const toggleFullLink = `
            <a id="toggle_full_list" href="#">
                <span class="_show">Show full list</span>
                <span class="_hide" style="display: none">Minimize full list</span>
            </a>`;
        const toggleHiddenLink = '<a id="toggle_hidden_list" href="#">Show hidden</a>';

        const links = `
            <p id="award_display_links" style="position: absolute; right: 0; top: 0; font-weight: bold">
                Display: <a id="display_all" href="#">All</a>,
                <a id="display_bronze"   class="display_award" href="#">Bronze</a>,
                <a id="display_silver"   class="display_award" href="#">Silver</a>,
                <a id="display_gold"     class="display_award" href="#">Gold</a>,
                <a id="display_platinum" class="display_award" href="#">Platinum</a>,
                ${toggleFullLink}, ${toggleHiddenLink}
            </p>`;

        const awardContainer = `
            <div id="award_container" class="container"
                 style="position: relative; top: 0; width: 830px; height: 240px; overflow: scroll">
                ${listTable}
            </div>`;

        const allHtml = `
            <div id="icm_award_html_container"
                 style="z-index: 0; position: relative; margin-top: 0; margin-bottom: 20px">
                ${toggleUpcomingLink}${links}${awardContainer}
            </div>`;

        $('#icm_award_html_container, #ua_toggle_link_container').remove();

        if (UpcomingAwardsOverview.matchesPageType('progress')) {
            $('#listOrdering').before(allHtml);
        } else {
            $('#itemContainer').before(allHtml);
        }

        const $lists = $('#award_table > tbody > tr');

        // hide hidden
        $lists.filter('.hidden-list').hide();

        const that = this;

        $('a.icm_toggle_list').on('click', function (e) {
            e.preventDefault();

            const $parent = $(this).parent().parent();
            const listTitle = $parent.find('.list-title').text().trim();
            const listUrl = $parent.data('list-url');
            const ind = that.hiddenLists.indexOf(listUrl);
            const hide = ind === -1;

            if (hide) { // hide list
                that.hiddenLists.push(listUrl);
            } else { // unhide list
                that.hiddenLists.splice(ind, 1);
            }

            $lists.filter(hide ? 'tr' : 'tr.hidden-list')
                .filter(function () { // get all awards with the same url
                    return $(this).data('list-url') === listUrl;
                })
                .toggleClass('hidden-list', hide)
                .hide() // = don't show in the current listing
                .find('.icm_toggle_list > img')
                .replaceWith(getIcon(!hide, listTitle));

            // save hidden lists
            gmSetValue('hidden_lists', JSON.stringify(that.hiddenLists));
        });

        $('#toggle_hidden_list').on('click', e => {
            e.preventDefault();

            $lists.hide();
            $lists.filter('.hidden-list').show();
        });

        $('#ua_toggle_link_container').on('click', 'a#toggle_upcoming_awards span', e => {
            e.preventDefault();

            $('#award_display_links, #award_container').toggle();
            $('a#toggle_upcoming_awards span').toggle();
        });

        $('#award_display_links').on('click', 'a#display_all', e => {
            e.preventDefault();

            $lists.hide();
            $lists.not('.hidden-list').show();
        });

        $('#award_display_links').on('click', 'a.display_award', function (e) {
            e.preventDefault();

            const [, awardType] = $(this).attr('id').split('_');
            $lists.hide().filter(function () {
                return !$(this).hasClass('hidden-list') &&
                    $(this).data('award-type').toLowerCase() === awardType;
            }).show();
        });

        $('#award_display_links').on('click', 'a#toggle_full_list span._show', e => {
            e.preventDefault();

            $('a#toggle_full_list span').toggle();
            $('div#award_container').css('height', 'auto');
        });

        $('#award_display_links').on('click', 'a#toggle_full_list span._hide', e => {
            e.preventDefault();

            $('a#toggle_full_list span').toggle();
            $('div#award_container').css('height', '240px');
        });
    }
}

class ListCustomColors extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Custom list colors',
            desc: 'Changes entry colors on lists to visually separate ' +
                'your favorites/watchlist/dislikes',
            id: 'list_colors',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch',
                'listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'colors.favorite',
                desc: 'Favorites',
                type: 'textinputcolor',
                default: '#ffdda9',
            }, {
                id: 'colors.watchlist',
                desc: 'Watchlist',
                type: 'textinputcolor',
                default: '#ffffd6',
            }, {
                id: 'colors.disliked',
                desc: 'Disliked',
                type: 'textinputcolor',
                default: '#ffad99',
            }],
        };
    }

    attach() {
        const buildCSS = (className, color) => {
            if (!color.length) {
                return '';
            }

            const sel = `ol#itemListMovies li.${className}`;
            return `${sel}, ${sel} ul.optionIconMenu { background-color: ${color} !important; }`;
        };

        const listColorsCss =
            buildCSS('favorite', this.config.colors.favorite) +
            buildCSS('watch', this.config.colors.watchlist) +
            buildCSS('hated', this.config.colors.disliked);

        gmAddStyle(listColorsCss);
    }
}

class ListCrossCheck extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'List cross-reference',
            desc: 'Cross-reference lists to find what films they share',
            id: 'list_cross_ref',
            enableOn: ['listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'match_all',
                desc: 'Find films that appear on all selected lists',
                type: 'checkbox',
                default: true,
            }, {
                id: 'match_min',
                desc: 'If the above checkbox is unchecked, find films that appear on this many lists',
                type: 'textinput',
                default: 2,
            }, {
                id: 'checks',
                desc: 'Include your checks in results (full intersection)',
                type: 'checkbox',
                default: false,
            }],
        };

        this.activatedOnce = false;
        this.init();
    }

    init() {
        this.activated = false;

        // array of movie objects
        this.movies = [];

        // array of top list jQuery elements
        this.$toplists = [];

        // cross-referencing in progress
        this.inProgress = false;

        // current top list's number that is checked
        this.sequenceNumber = 0;
    }

    attach() {
        if (!$('#itemListToplists').length) {
            return;
        }

        const actions = `
            <div id="crActions" style="margin-bottom: 18px">
                <button id="cfgListCCActivate">Activate CR</button>
            </div>`;

        $('#itemContainer').before(actions);
        const that = this;

        $('div#crActions').on('click', 'button#cfgListCCActivate', function () {
            $(this).prop('disabled', true);
            that.createTab();
            that.activate();
        });

        const customCSS = `
            <style type="text/css">
                ol#itemListToplists li.icme_listcc_selected,
                ol#itemListToplists li.icme_listcc_hover,
                .icme_listcc_selected .progress,
                .icme_listcc_hover .progress {
                    background-color: #cccccc !important;
                }
                ol#itemListToplists li.icme_listcc_pending,
                .icme_listcc_pending .progress {
                    background-color: #ffffb2 !important;
                }
            </style>`;

        $('head').append(customCSS);
    }

    activate() {
        this.init();
        this.activated = true;
        const that = this;

        $('button#cfgListCCActivate')
            .after('<button id="cfgListCCDeactivate">Deactivate</button>');

        $('div#crActions').on('click', 'button#cfgListCCDeactivate', () => {
            that.deactivate();
            $('button#cfgListCCActivate').prop('disabled', false);
        });

        // ff 3.6 compatibility (ff 3.6 fails to unbind the events in all possible ways)
        if (this.activatedOnce) {
            return;
        }

        $('ol#itemListToplists li').on('click mouseover mouseout', function (e) {
            const activeAndIdle = that.activated && !that.inProgress;
            if (!activeAndIdle) { // ff 3.6 compatibility
                return;
            }

            const $li = $(this);
            // event actions must not work for cloned toplists under the selected tab
            if ($li.hasClass('icme_listcc')) {
                // eslint-disable-next-line consistent-return
                return false; // ff 3.6 compatibility
            }

            const wasSelected = $li.hasClass('icme_listcc_selected');
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

            // eslint-disable-next-line consistent-return
            return false; // ff 3.6 compatibility
        });

        this.activatedOnce = true;
    }

    deactivate() {
        const $selectedToplists = $('li.icme_listcc_selected', 'ul#topLists');

        // if there's still selected top lists, change them back to normal
        $selectedToplists.removeClass('icme_listcc_selected').find('span.percentage').show();

        $('ol#itemListToplists').children('li')
            .removeClass('icme_listcc_selected').removeClass('icme_listcc_hover');
        $('button#icme_listcc_check, button#cfgListCCDeactivate').remove();
        $('li#topListCategoryCCSelected').remove();
        $('button#cfgListCCActivate').prop('disabled', false);

        this.init();
    }

    // Check through every selected top list
    check() {
        const $toplistCont = $('ol#itemListToplists');

        // make selected top lists normal under the regular tabs
        $toplistCont.children('li.icme_listcc_selected')
            .removeClass('icme_listcc_selected')
            .find('span.percentage').show();

        // get selected top lists
        const $toplists = $toplistCont.children('li.icme_listcc');

        this.inProgress = true;

        // sort selected top lists in ascending order by number of unchecked films
        const getUnchecked = x => {
            const checks = $(x).find('span.info > strong:first').text().split('/');
            return checks[1] - checks[0];
        };

        $toplists.sort((a, b) => (getUnchecked(a) < getUnchecked(b) ? -1 : 1));

        // make selected toplists highlighted under the selected tab
        $toplists.addClass('icme_listcc_selected').find('span.percentage').hide();

        this.$toplists = $toplists;
        this.getUncheckedFilms(this.$toplists.eq(this.sequenceNumber));
    }

    getUncheckedFilms($list) {
        const url = $list.find('a').attr('href');
        $list.addClass('icme_listcc_pending');

        const that = this;
        $.get(url, response => {
            $list.removeClass('icme_listcc_selected icme_listcc_pending')
                .find('span.percentage').show();

            const filter = that.config.checks ? '' : 'li.unchecked';
            // the site returns html with extra whitespace
            const $unchecked = $($.parseHTML(response)).find('ol#itemListMovies').children(filter);

            that.updateMovies($unchecked);
        });
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Update array of movies.
     *
     * @param {jQuery} $content - unchecked movies (<li> elements) on a top list page
     */
    updateMovies($content) {
        this.sequenceNumber += 1;

        // keeps track if at least one movie on the current top list is also found
        //   on all previous top lists (if checking for movies found on all top lists).
        // it's a major optimization that halts the script if there's a top list with 0 matches
        //   especially early on and doesn't go on to check all the rest of the lists wasting time
        let globalToplistMatch = false;

        const showPerfectMatches = this.config.match_all;

        const that = this;
        $content.each(function () {
            let found = false;
            const $movie = $(this);
            const $movieTitle = $movie.find('h2');
            const title = $movieTitle.text().trim();
            const url = $movieTitle.find('a').attr('href');
            const year = $movieTitle.next('span.info').children('a:first').text();

            for (const movieObj of that.movies) {
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
                const itemid = $movie.attr('id');

                // check if owned
                const owned = JSON.parse(gmGetValue('owned_movies', '[]'));
                if (owned.indexOf(itemid) !== -1) {
                    $movie.removeClass('notowned').addClass('owned');
                }

                that.movies.push({ title, url, year, count: 1, jq: $movie });
            }
        });

        let hasToplistsLeft = this.sequenceNumber < this.$toplists.length;

        // if finding movies on all selected top lists
        if (showPerfectMatches) {
            // if one or more movies was found on all selected top lists
            if (globalToplistMatch) {
                // if not first top list, extract movies that have been found
                // on all selected top lists
                if (this.sequenceNumber > 1) {
                    const cutoff = this.sequenceNumber;
                    this.movies = $.grep(this.movies, el => el.count === cutoff);
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
    }

    outputMovies() {
        const showPerfectMatches = this.config.match_all;

        if (!showPerfectMatches) {
            const limit = this.config.match_min;

            if (limit > 0) {
                this.movies = $.grep(this.movies, el => el.count >= limit);
            }
        }

        // Sort by checks DESC, then by year ASC, then by title ASC
        this.movies.sort((a, b) => {
            /* eslint-disable no-else-return */
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
            /* eslint-enable no-else-return */

            return 0;
        });

        if (this.movies.length) {
            let menu = '<ul>';
            this.$toplists.each(function () {
                menu += `<li><b>${$(this).find('h2').text()}</b></li>`;
            });

            menu += `</ul>
                <ul class="tabMenu tabMenuPush">
                    <li class="topListMoviesFilter active">
                        <a href="#" title="View all movies">All (${this.movies.length})</a>
                    </li>
                    <li class="listFilterExportCSV">
                        <a href="#" title="Export all movies in CSV format">Export CSV</a>
                    </li>
                '</ul>`;

            // hide previous movie list
            $('#itemListMovies').removeAttr('id').hide();

            $('#itemContainer').after('<ol id="itemListMovies" class="itemList listViewNormal"></ol>');
            $('#itemContainer').after(menu);
            for (const movie of this.movies) {
                $('#itemListMovies').append(movie.jq);
            }

            $('#itemListMovies').children('li').show();

            $('.topListMoviesFilter a').on('click', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                const $this = $(this);
                const $movielist = $this.parent().parent().next();

                if ($movielist.is(':visible')) {
                    $this.parent().removeClass('active');
                    $movielist.removeAttr('id').hide();
                } else {
                    $this.parent().addClass('active');
                    $movielist.attr('id', 'itemListMovies').show();
                }
            });
            $('.listFilterExportCSV a').on('click', function (e) {
                e.preventDefault();

                let data = '"found_toplists","title","year","official_toplists","imdb"\n';
                // target only the list below the button (in case there are several)
                const $items = $(this).parents('.tabMenu').next('.itemList').children('li');

                $items.each(function () {
                    const $item = $(this);
                    const foundToplists = $item.find('.rank').text();
                    const title = $item.find('h2').text().trim().replace('"', '""');
                    const year = $item.find('.info a:first').text();
                    const toplists = Number($item.find('.info a:last').text());
                    const imdburl = $item.find('.optionIMDB').attr('href');
                    const line = `"${foundToplists}","${title}","${year}","${toplists}","${imdburl}"\n`;

                    data += line;
                });

                // This should use window instead of unsafeWindow, but
                // FF 39.0.3 broke changing window.location in GM sandbox.
                // When they fix that, either revert back to window
                // or re-use code from ExportLists.
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1192821
                // https://github.com/greasemonkey/greasemonkey/issues/2232
                unsafeWindow.location.href = `data:text/csv;charset=utf-8,${encodeURIComponent(data)}`;
            });
        } else {
            $('#icme-crossref-notfound').remove();
            $('#itemContainer').after('<div id="icme-crossref-notfound">Found 0 movies.</div>');
        }

        this.deactivate();
    }

    createTab() {
        if ($('#listFilterCRSelected').length) {
            return;
        }

        const tab = `
            <li id="listFilterCRSelected">
                <a href="#" class="icme_listcc">Cross-reference</a>
                <strong style="display: none">Cross-reference</strong>
            </li>`;

        const $tlfilter = $('ul.tabMenu', 'div#itemContainer');
        $tlfilter.append(tab);

        const that = this;

        // Modified from ICM source. Make the tab work.
        $('#listFilterCRSelected a').on('click', function () {
            const a = $(this).attr('class');
            let $b = $(this).closest('li');
            $('.tabMenu').find('li').each(function () {
                $(this).removeClass('active');
            });
            $b.addClass('active');

            if (a === 'icme_listcc' && !that.inProgress) {
                const $topListUl = $('ol#itemListToplists');
                $topListUl.children('li.icme_listcc').remove();

                const $topLists = $topListUl.children('li.icme_listcc_selected').clone();

                $topLists
                    .removeClass('imdb critics prizes website institute misc icme_listcc_selected')
                    .addClass('icme_listcc').find('span.percentage').show();

                $topListUl.append($topLists);

                const selectedTwoOrMore = $('li.icme_listcc', 'ol#itemListToplists').length >= 2;
                if (selectedTwoOrMore && $('button#icme_listcc_check').length === 0) {
                    const btn = '<button id="icme_listcc_check">Cross-reference</button>';

                    $('div#crActions').append(btn);

                    $('button#icme_listcc_check').on('click', function () {
                        $(this).prop('disabled', true);

                        that.check();
                    });

                    // Make the current tab work if we want to return to it
                    $('ul.tabMenu').children('li').each(function () {
                        if (!$(this).children('a').length) {
                            const $clicked = $(this);
                            $clicked.on('click', () => {
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
            $b.find(`li.${a}`).show();

            return false;
        });
    }
}

class HideTags extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Hide tags',
            desc: 'Hides tags on movie lists and lists of lists',
            id: 'hide_tags',
            // ICM bug: movieListGeneral and movieSearch never have tags
            enableOn: ['listsGeneral', 'listsSpecial', 'listsSearch',
                'movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch', 'movieRankings'],
            options: [BaseModule.getStatus(false), {
                id: 'list_tags',
                frontDesc: 'Hide on: ',
                desc: 'lists',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'movie_tags',
                desc: 'movies',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'show_hover',
                desc: 'Show tags when moving the cursor over a movie or a list',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.list_tags) {
            // /lists/ and /movies/<title>/rankings/ have different structure
            gmAddStyle(`
                ol#itemListToplists.listViewNormal > li > .info:last-child,
                ol#itemListToplists > li > .tagList {
                    display: none !important;
                }
            `);
        }

        if (this.config.movie_tags) {
            gmAddStyle(`
                ol#itemListMovies.listViewNormal > li > .tagList {
                    display: none !important;
                }
            `);
        }

        if (this.config.show_hover) {
            gmAddStyle(`
                ol#itemListToplists.listViewNormal > li:hover > .info:last-child,
                ol#itemListToplists > li:hover > .tagList,
                ol#itemListMovies.listViewNormal > li:hover > .tagList {
                    display: block !important;
                }
            `);
        }
    }
}

class NewTabs extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'New tabs',
            desc: 'Adds additional tabs on movie lists',
            id: 'new_tabs',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch',
                'movie', 'movieRankings'],
            options: [BaseModule.getStatus(false), {
                id: 'owned_tab',
                frontDesc: 'Create tabs for: ',
                desc: 'owned movies',
                type: 'checkbox',
                inline: true,
                default: false,
            }, {
                id: 'watchlist_tab',
                desc: 'watchlisted movies',
                type: 'checkbox',
                inline: true,
                default: false,
            }, {
                id: 'free_account',
                desc: 'Store owned movies (emulates the paid feature, ' +
                    'enable only if you have a free account)',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.watchlist_tab && NewTabs.matchesPageType('movieList')) {
            NewTabs.addNewTab('watch', 'watchlist');
        }

        const $markOwned = $('.optionMarkOwned');
        if (this.config.owned_tab && $markOwned.length) {
            if (this.config.free_account) {
                NewTabs.trackOwned($markOwned);
            }

            NewTabs.addNewTab('owned', 'owned');
        }
    }

    // Add a new tab to a movie list (modified from ICM source)
    static addNewTab(itemClass, title) {
        const $movielist = $('#itemListMovies');
        if (!$movielist.length) {
            return;
        }

        title = title.toLowerCase();
        const titleCap = title.charAt(0).toUpperCase() + title.slice(1);
        const count = $movielist.children(`li.${itemClass}`).length;
        const tabHtml = `<li id="listFilter${titleCap}" class="topListMoviesFilter">` +
            `<a id="linkListFilter${titleCap}" title="View all your ${title} movies" href="#">` +
            `${titleCap} <span id="topListMovies${titleCap}Count">(${count})</span></a>` +
            '</li>';

        $('#listFilterNew').before(tabHtml);

        const $first = $('#listFilterMovies').find('a');
        $first.text($first.text().replace(' movies', ''));

        // move the order by and views to filter box
        if (!$('#orderByAndView').length && $('#topList').length) {
            $('#topList').append('<div id="orderByAndView" ' +
                'style="z-index:200; position:absolute; top:30px; right:0; width:300px; height:20px">');
            $('#listOrdering').detach().appendTo('#orderByAndView');
            $('#listViewswitch').detach().appendTo('#orderByAndView');
        }

        $(`#linkListFilter${titleCap}`).on('click', function () {
            $movielist.children('li.listItem').hide();
            $movielist.children(`li.${itemClass}`).show();
            $('#topListAllMovies').hide();

            const $tab = $(this).closest('li');
            $tab.siblings().removeClass('active');
            $tab.addClass('active');

            return false;
        });
    }

    static movieData($markOwnedBtn, owned) {
        const $checkbox = $markOwnedBtn.closest('.optionIconMenu').prev('.checkbox');
        const $movie = $checkbox.parent();
        const movieId = $checkbox.attr('id').replace('check', 'movie');
        const posInStorage = owned.indexOf(movieId);
        return { $movie, movieId, posInStorage };
    }

    static trackOwned($markOwned) {
        let owned = JSON.parse(gmGetValue('owned_movies', '[]'));
        const $movielist = $('#itemListMovies');
        const onListPage = $movielist.length !== 0;

        // mark owned movies as owned
        $markOwned.each(function () {
            const { $movie, posInStorage } = NewTabs.movieData($(this), owned);

            // if movie id is found in cached owned movies
            if (posInStorage !== -1) {
                $movie.toggleClass('notowned owned');
            }

            // Remove paid feature pop-up
            // (Page script binds events with its own jQuery before TM loads the script,
            //  can't find a way to unbind them without unsafeWindow.
            //  And only in FF (46) does removing the class also unbind events, but not in Chrome.)
            unsafeWindow.$(this)
                .unbind('mouseenter mouseleave')
                .removeClass('paidFeature');
        });

        $markOwned.on('click', function () {
            owned = JSON.parse(gmGetValue('owned_movies', '[]')); // reload storage
            const { $movie, movieId, posInStorage } = NewTabs.movieData($(this), owned);

            // remove if movie id is found in cached owned movies, else store
            if (posInStorage !== -1) {
                owned.splice(posInStorage, 1);
            } else {
                owned.push(movieId);
            }

            $movie.toggleClass('notowned owned');

            if (onListPage) {
                const ownedCount = $movielist.children('li.owned').length;
                $('#topListMoviesOwnedCount').text(`(${ownedCount})`);
            }

            gmSetValue('owned_movies', JSON.stringify(owned));

            return false;
        });
    }
}

class LargeList extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Large posters',
            desc: 'Display large posters on individual lists (large posters are lazy loaded)',
            id: 'large_lists',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'autoload',
                desc: 'Autoload',
                type: 'checkbox',
                default: false,
            }, {
                id: 'noinfo',
                desc: 'Hide info (title, year, lists)',
                type: 'checkbox',
                default: false,
            }],
        };

        this.loaded = false;
    }

    attach() {
        if (this.config.autoload) {
            this.load();
            return;
        }

        // create link
        const link = `
            <span style="float: right; margin-left: 15px">
                <a id="icme_large_posters" href="#">Large posters</a>
            </span>`;

        addToMovieListBar(link);

        const that = this;
        $('#icme_large_posters').on('click', e => {
            e.preventDefault();
            that.load();
        });
    }

    load() {
        if (this.loaded) {
            return;
        }

        this.loaded = true;

        // make sure normal view is enabled
        LargeList.enableNormalView();

        const root = '#itemListMovies.listViewNormal';
        let style = `
            ${root} > .listItem {
                float: left;
                width: 255px;
            }
            ${root} .listItem .listImage {
                float: none;
                width: 230px;
                height: 305px;
                left: -18px;
                top: -18px;
                margin: 0;
            }
            ${root} .listImage a {
                width: 100%;
                height: 100%;
                background: url("/images/dvdCover.png") no-repeat scroll center center transparent;
            }
            ${root} .listImage .coverImage {
                width: 190px;
                height: 258px;
                top: 21px;
                left: 19px;
                right: auto;
            }
            ${root} .listItem .rank {
                top: 15px;
                position: absolute;
                height: auto;
                width: 65px;
                right: 0;
                margin: 0;
                font-size: 30px;
            }
            ${root} .listItem .rank .positiondifference span { font-size: 12px; }
            ${root} .listItem h2 {
                z-index: 11;
                font-size: 14px;
                width: 100%;
                margin:-30px 0 0 0;
            }
            ${root} .listItem .info {
                font-size: 12px;
                width: 100%;
                height: auto;
                line-height: 16px;
                margin-top: 4px;
            }
            ${root} .checkbox { top: 85px; right: 12px; }
            ${root} .optionIconMenu { top: 120px; right: 20px; }
            ${root} .optionIconMenu li { display: block; }
            ${root} .optionIconMenuCheckbox { right: 20px; }
            #itemListMovies.listViewCompact > .listItem { height: auto; }
        `;

        style = style.replace(/;/g, ' !important;');

        gmAddStyle(style);

        const $c = $('#itemListMovies').find('div.coverImage').hide();
        for (let i = 0; i < $c.length; i++) {
            let cururl = $c[i].style.backgroundImage;
            if (cururl.substr(4, 1) !== 'h') {
                cururl = cururl.slice(5, -2).replace('small', 'medium').replace('Small', 'Medium');
            } else { // chrome handles urls differently
                cururl = cururl.slice(4, -1).replace('small', 'medium').replace('Small', 'Medium');
            }

            const img = document.createElement('img');
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIA' +
                'AACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMA' +
                'AA7DAcdvqGQAAAAMSURBVBhXY5j8rA8ABBcCCCnPKCcAAAAASUVORK5CYII=';
            img.className = 'coverImage';
            img.setAttribute('data-original', cururl);
            $c[i].parentNode.appendChild(img);
        }

        $('img.coverImage').lazyload({ threshold: 200 });

        if (this.config.noinfo) {
            $('#itemListMovies > li').css('height', '270px').children('h2, span.info').remove();
        } else {
            // tags and long titles can increase item's height
            // only needs to be done if titles are shown
            LargeList.adjustHeights();
        }
    }

    static enableNormalView() {
        const $normalViewSwitch = $('#listViewNormal').find('a');
        if (!$normalViewSwitch.hasClass('active')) {
            // copied from ICM source code
            $('#listViewCompact').find('a').removeClass('active');
            $normalViewSwitch.addClass('active');
            $('ol.itemList')
                .removeClass('listViewCompact')
                .addClass('listViewNormal');
        }
    }

    static adjustHeights() {
        $('.listItemMovie:nth-child(3n-2)').each(function () {
            const $t = $(this);
            const $t2 = $t.next();
            const $t3 = $t2.next();
            const maxHeight = Math.max($t.height(), $t2.height(), $t3.height());
            $t.add($t2).add($t3).height(maxHeight);
        });
    }
}

class ListOverviewSort extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Progress page',
            desc: 'Change the order of lists on the progress page',
            id: 'toplists_sort',
            enableOn: ['progress'],
            options: [BaseModule.getStatus(false), {
                id: 'autosort',
                desc: 'Sort lists by completion rate',
                type: 'checkbox',
                default: true,
            }, {
                id: 'order',
                desc: 'Descending',
                type: 'checkbox',
                default: true,
            }, {
                id: 'single_col',
                desc: 'Single column',
                type: 'checkbox',
                default: false,
            }, {
                id: 'icebergs',
                desc: 'Fill columns from left to right',
                type: 'checkbox',
                default: false,
            }, {
                id: 'hide_imdb',
                desc: 'Hide IMDb lists from "All" tab',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.single_col) {
            gmAddStyle('.itemList .listItem.listItemProgress { float: none !important; }');
        }

        const order = this.config.order === true ? 'desc' : 'asc';
        this.rearrange(order, 'all');

        const that = this;
        $('#progressFilter a').not('#progressFilter-all').one('click', function () {
            const [, section] = $(this).attr('id').split('-');
            that.rearrange(order, section);
        });
    }

    rearrange(order, section) {
        const $toplistList = $(`#progress${section}`);
        let $toplistItems = $toplistList.children('li').detach();
        let isInterweaved = true;

        if (this.config.hide_imdb && section === 'all') {
            if (this.config.autosort) {
                $toplistItems = $toplistItems.not('.imdb');
                // list would be sorted anyway, but until then the order is incorrect
            } else {
                // preserve original order
                $toplistItems = $(ListOverviewSort.straighten($toplistItems.toArray())).not('.imdb');
                isInterweaved = false;
            }
        }

        let toplistArr = $toplistItems.toArray();

        if (this.config.autosort) {
            const lookupMap = toplistArr.map((item, index) => {
                const width = $(item).find('span.progress').css('width').replace('px', '');
                return { index, value: parseFloat(width) };
            });

            lookupMap.sort((a, b) => (order === 'asc' ? 1 : -1) * (a.value > b.value ? 1 : -1));
            toplistArr = lookupMap.map(e => toplistArr[e.index]);
            isInterweaved = false;
        }

        // check corner cases to avoid excessive sorting
        const verticalOrder = this.config.icebergs || this.config.single_col;
        if (!isInterweaved && !verticalOrder) {
            // restore default two-column view after sorting/hiding
            toplistArr = ListOverviewSort.interweave(toplistArr);
        }

        if (isInterweaved && verticalOrder) {
            // no sorting/hiding happened; rearrange the list with original order
            toplistArr = ListOverviewSort.straighten(toplistArr);
        }

        $toplistList.append(toplistArr);
    }

    // [1, 'a', 2, 'b', 3, 'c']    -> [1, 2, 3, 'a', 'b', 'c']
    // [1, 'a', 2, 'b', 3, 'c', 4] -> [1, 2, 3, 4, 'a', 'b', 'c']
    static straighten(list) {
        const even = [];
        const odd = [];
        for (let i = 0; i < list.length; i++) {
            if (i % 2 === 0) {
                even.push(list[i]);
            } else {
                odd.push(list[i]);
            }
        }

        return $.merge(even, odd);
    }

    // [1, 2, 3, 'a', 'b', 'c']    -> [1, 'a', 2, 'b', 3, 'c']
    // [1, 2, 3, 4, 'a', 'b', 'c'] -> [1, 'a', 2, 'b', 3, 'c', 4]
    static interweave(list) {
        const res = [];
        const halfLen = Math.ceil(list.length / 2);
        for (let i = 0; i < halfLen; i++) {
            res.push(list[i]);
            if (i + halfLen < list.length) {
                res.push(list[i + halfLen]);
            }
        }

        return res;
    }

    // tests
    /* a = [1, 'a', 2, 'b', 3, 'c', 4, 'd'];
    b = [1, 'a', 2, 'b', 3, 'c', 4];
    function test(arr) {
        return JSON.stringify(arr) === JSON.stringify(interweave(straighten(arr)));
    }
    test(a) && test(b) */
}

class ListsTabDisplay extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Lists tab display',
            desc: 'Organize movie info tab with all lists (/movies/*/rankings/, ' +
                '<a href="/movies/pulp+fiction/rankings/">example</a>)',
            id: 'lists_tab_display',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial',
                'movieRankings', 'movieSearch', 'listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'redirect',
                desc: 'Redirect "in # lists" movie links to "All" lists tab',
                type: 'checkbox',
                default: true,
            }, {
                id: 'sort_official',
                frontDesc: 'Auto-sort (move to the top): ',
                desc: 'official lists',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'sort_filmos',
                desc: 'filmographies',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'sort_groups',
                desc: 'lists from user defined groups',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'group1',
                desc: 'Group 1',
                type: 'textarea',
                default: [],
            }, {
                id: 'group2',
                desc: 'Group 2',
                type: 'textarea',
                default: [],
            }],
        };

        this.$block = $('#itemListToplists');
        this.sep = '<li class="groupSeparator"><br><hr><br></li>';
        // multiline regex that leaves only list name, excl. a common beginning and parameters
        this.reURL = /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:icheckmovies.com)?\/?(?:lists)?\/?([^?\s]+\/)(?:\?.+)?[ \t]*$/gm;
    }

    attach() {
        if (ListsTabDisplay.matchesPageType('movieRankings')) {
            this.sortLists();
        } else if (this.config.redirect) {
            // cross-referencing adds new blocks that must also be fixed
            const onListOfLists = ListsTabDisplay.matchesPageType(['listsGeneral', 'listsSpecial']);
            if (onListOfLists && this.globalCfg.data.list_cross_ref.enabled) {
                const observer = new MutationObserver(mutations => {
                    for (const mutation of mutations) {
                        // Array.from is not needed in FF, but NodeList is not iterable in Chrome:
                        // https://code.google.com/p/chromium/issues/detail?id=401699
                        for (const el of Array.from(mutation.addedNodes)) {
                            if (el.id === 'itemListMovies') {
                                ListsTabDisplay.fixLinks($(el));
                            }
                        }
                    }
                });
                observer.observe($('#crActions').parent()[0], { childList: true });
            } else { // most common case
                ListsTabDisplay.fixLinks();
            }
        }
    }

    sortLists() {
        const lists = this.$block.children();
        const cfg = this.config;

        if (cfg.sort_official) {
            const officialLists = lists
                .has('ul.tagList a[href$="user%3Aicheckmovies"]')
                .filter(function () {
                    // icm bug: deleted lists reset to icheckmovies user
                    return !$(this).find('.title').attr('href').endsWith('//');
                });
            this.move(officialLists);
        }

        if (cfg.sort_groups) {
            for (const group of ['group1', 'group2']) {
                let stored = cfg[group];
                if (typeof stored === 'string') {
                    // Parse textarea content
                    console.log('Parsing ListsTabDisplay group', group);
                    stored = stored.trim().replace(this.reURL, '$1').split('\n');
                    cfg[group] = stored;
                    this.globalCfg.save();
                }

                const $personal = this.getLists(stored);
                this.move($personal);
            }
        }

        if (cfg.sort_filmos) {
            const $filmos = lists.filter(function () {
                return $(this).text().toLowerCase().indexOf('filmography') >= 0;
            });
            this.move($filmos);
        }

        // visual fix for edge cases when all lists are moved
        lists.last().filter('.groupSeparator').hide();
    }

    move(lists) {
        if (!lists.length) {
            return;
        }

        const $target = this.$block.find('li.groupSeparator').last();
        if ($target.length) {
            $target.after(lists, this.sep);
        } else {
            this.$block.prepend(lists, this.sep);
        }
    }

    getLists(listIDs) {
        if (!listIDs.length) {
            return [];
        }

        const $selected = this.$block.children().filter(function () {
            const href = $(this).find('a.title').attr('href');
            return href && $.inArray(href.substring(7), listIDs) !== -1; // sep matches too
        });
        return $selected;
    }

    // $container - Optional target that contains links to be fixed
    static fixLinks($container) {
        if ($container === undefined) {
            $container = $('body');
        }

        const $linksToLists = $container.find('.listItemMovie > .info > a:nth-of-type(2)');
        $linksToLists.each(function () {
            const $link = $(this);
            const url = $link.attr('href').replace('?tags=user:icheckmovies', '');
            $link.attr('href', url);
        });
    }
}

class ExportLists extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Export lists',
            desc: 'Download any list as .csv (doesn\'t support search results). ' +
                'Emulates the paid feature, so don\'t enable it if you have a paid account',
            id: 'export_lists',
            enableOn: ['movieList', 'movieListSpecial'],
            options: [BaseModule.getStatus(false), {
                id: 'delimiter',
                desc: 'Use as delimiter (accepts \';\' or \',\'; otherwise uses \\t)',
                type: 'textinput',
                default: ';',
            }, {
                id: 'bom',
                desc: 'Include BOM (required for Excel)',
                type: 'checkbox',
                default: true,
            }],
        };
    }

    attach() {
        const cfg = this.config;
        let sep = cfg.delimiter;

        $('.optionExport').one('click', function () {
            if (sep !== ',' && sep !== ';') {
                sep = '\t';
            }

            const colNames = ['rank', 'title', 'aka', 'year', 'official_toplists',
                'checked', 'favorite', 'dislike', 'imdb'];
            let data = `${colNames.join(sep)}${sep}\n`;

            const encodeField = field => (field.indexOf('"') !== -1 || field.indexOf(sep) !== -1 ?
                `"${field.replace(/"/g, '""')}"` :
                field);

            $('#itemListMovies > li').each(function () {
                const $item = $(this);
                const rank = $item.find('.rank').text().trim().replace(/ .+/, '');
                const title = encodeField($item.find('h2>a').text());
                const aka = encodeField($item.find('.info > em').text());
                const year = $item.find('.info a:first').text();
                const toplists = parseInt($item.find('.info a:nth-of-type(2)').text(), 10);
                const checked = $item.hasClass('checked') ? 'yes' : 'no';
                const isFav = $item.hasClass('favorite') ? 'yes' : 'no';
                const isDislike = $item.hasClass('hated') ? 'yes' : 'no';
                const imdburl = $item.find('.optionIMDB').attr('href');
                const cols = [rank, title, aka, year, toplists, checked, isFav, isDislike, imdburl];
                const line = `${cols.join(sep)}${sep}\n`;
                data += line;
            });

            // BOM with ; or , as separator and without sep= - for Excel
            const bom = cfg.bom ? '\uFEFF' : '';
            const dataURI = `data:text/csv;charset=utf-8,${bom}${encodeURIComponent(data)}`;
            const filename = $('#topList>h1').text().trim() || $('#listTitle > h1').text().trim();
            // link swapping with a correct filename - http://caniuse.com/download
            $(this).attr('href', dataURI).attr('download', `${filename}.csv`);

            // after changing URL jQuery fires a default click event
            // on the link user clicked on, and loads dataURI as URL (!)
            // I could've used preventDefault + change window.location.href,
            // but that way the file wouldn't have a correct filename
        });
    }
}

class ProgressTopX extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Progress top X',
            desc: 'Find out how many checks you need to get into Top 25/50/100/1000/...',
            id: 'progress_top_x',
            enableOn: ['progress'],
            options: [BaseModule.getStatus(true), {
                id: 'target_page',
                desc: 'Ranking page you want to be on (page x 25 = rank)',
                type: 'textinput',
                default: '40',
            }],
        };
    }

    attach() {
        const style = 'float: left; margin-right: 0.5em';
        const attr = { style, text: 'Load stats', id: 'icme_req_for_top', href: '#' };
        // can't pass the value directly in case of user changing it and not reloading
        const $loadLink = $('<a>', attr).click({ cfg: this.config }, ProgressTopX.addStats);
        const $spanElem = $('<span>', { style, text: ' | ' });

        $('#listOrderingWrapper').prepend($loadLink, $spanElem);
    }

    static addStats(event) {
        const targetPage = parseInt(event.data.cfg.target_page, 10); // * 25 = target rank
        const $lists = $('.itemListCompact[id^="progress"]:visible span.rank a');

        $lists.each(function () {
            const $list = $(this);
            const oldText = $list.text();
            const curRank = oldText.match(/\d+/);

            if (curRank < targetPage * 25) {
                return;
            }

            const url = $list.attr('href').replace(/=.*$/, `=${targetPage}`);
            const progress = parseInt($list.parent().text().match(/\d+/), 10);

            $.get(url, data => {
                data = data.match(/\d+<\/strong> checks in this list,/g).pop().match(/\d+/);
                if (data) {
                    const minchecks = parseInt(data[0], 10);
                    const dif = minchecks - progress;
                    $list.text(`${oldText} - ${minchecks} req - ${dif} dif`);
                    $list.attr('href', url);
                }
            });
        });

        return false; // prevents auto-scrolling to the top
    }
}

class FastReorderLists extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Fast reorder lists',
            desc: 'Double-click a list to display an input field where you can input ' +
                'a new position and hit Enter key to move the list to that position',
            id: 'fast_reorder_lists',
            enableOn: ['listsSpecial'],
            options: [BaseModule.getStatus(true)],
        };

        this.$active = null;
    }

    attach() {
        gmAddStyle('#rankInput { width: 40px; position: absolute; }');

        const that = this;
        $('#itemListToplists').on('dblclick', 'li', function () {
            that.addRankInput(this);
        });
    }

    addRankInput(elem) {
        this.$active = $(elem);
        $('#rankInput').remove();
        const $input = $('<input>').attr('type', 'text').attr('id', 'rankInput');
        $input.css('top', this.$active.offset().top);
        $input.css('left', this.$active.offset().left - 45);
        $('body').append($input);
        $('#rankInput').focus();
        const that = this;
        $('#rankInput').on('keydown', e => {
            if (e.which === 13) {
                that.moveList();
            }
        });
    }

    moveList() {
        if (this.$active === null) {
            return;
        }

        const currentRank = Number(this.$active.find('.rank').text());
        const newRank = Number($('#rankInput').val());

        const isSameRank = newRank === currentRank;
        if (isSameRank) {
            $('#rankInput').remove();
            this.$active = null;
            return;
        }

        const outOfBounds = newRank > $('#itemListToplists > li').length ||
            newRank < 1;
        if (Number.isNaN(newRank) || outOfBounds) {
            alert('Invalid position');
            return;
        }

        const directionUp = newRank < currentRank;
        if (directionUp) {
            this.$active.insertBefore($('#itemListToplists > li').eq(newRank - 1));
        } else {
            this.$active.insertAfter($('#itemListToplists > li').eq(newRank - 1));
        }

        unsafeWindow.$.iCheckMovies.reOrderTypeSerializedItems.itemListToplists =
            unsafeWindow.jQuery('#itemListToplists').sortable('serialize');
        unsafeWindow.$.iCheckMovies.reOrder('itemListToplists');
        $('#rankInput').remove();
        this.$active = null;
    }
}

// ----- Main -----

// Main application; initializes, registers and loads modules.
class App {
    constructor(globalCfg) {
        this.modules = [];
        this.globalCfg = globalCfg;
        this.configWindow = new ConfigWindow(globalCfg);
    }

    register(Module) {
        const module = new Module(this.globalCfg);
        this.modules.push(module);
        module.syncGlobalCfg();
        this.configWindow.addModule(module.metadata);
    }

    load() {
        for (const m of this.modules) {
            if (m.isOnSupportedPage()) {
                if (m.config.enabled) {
                    console.log(`Attaching ${m.constructor.name}`);
                    m.attach();
                } else {
                    console.log(`Skipping ${m.constructor.name}`);
                }
            }
        }

        this.configWindow.build();
    }
}

const globalCfg = new GlobalCfg();

const useModules = [
    RandomFilmLink,
    HideTags,
    UpcomingAwardsList,
    ListCustomColors,
    UpcomingAwardsOverview,
    ListCrossCheck,
    NewTabs,
    LargeList,
    ListOverviewSort,
    ListsTabDisplay,
    ExportLists,
    ProgressTopX,
    FastReorderLists,
];

const app = new App(globalCfg);
useModules.forEach(app.register);
app.load();
console.log('ICM Enhanced is ready.');
