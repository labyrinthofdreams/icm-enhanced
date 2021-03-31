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
// @require        https://cdnjs.cloudflare.com/ajax/libs/jqModal/1.3.0/jqModal.min.js
// @grant          unsafeWindow
// ==/UserScript==

'use strict';

const VERSION = '1.8.0';

// ----- Utils -----

const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const load = key => JSON.parse(localStorage.getItem(key));
const addCSS = css => document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

const extractFrom = async (url, extractor) => {
    const r = await fetch(url, { credentials: 'same-origin' });
    const html = await r.text();
    const el = new DOMParser().parseFromString(html, 'text/html');
    return extractor(el);
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ----- Interacting with ICM -----

// Mutually exclusive regexes for matching page type
const reICM = Object.freeze({
    movie: // movie pages only, not /movies/ or /movies/checked/ etc. or /rankings/
        // https://www.icheckmovies.com/movies/inception/
        // https://www.icheckmovies.com/movies/inception/comments/
        /icheckmovies\.com\/movies\/(?!$|\?|(?:(un)?checked|favorited|disliked|watchlist|owned|recommended)\/)[^/]+\/(?!rankings\/)/,
    movieList: // personal user list
        // https://www.icheckmovies.com/lists/imdbs+2010s+top+50/
        // https://www.icheckmovies.com/lists/imdbs+2010s+top+50/?sort=title
        // https://www.icheckmovies.com/lists/alfred+hitchcock+filmography/fritz/
        // https://www.icheckmovies.com/lists/alfred+hitchcock+filmography/fritz/?sort=title
        // https://www.icheckmovies.com/lists/watchlist+2015/juliske/
        /icheckmovies\.com\/lists\/(?!$|\?|(?:favorited|disliked|watchlist)\/)/,
    movieListGeneral: // /movies/ only
        // https://www.icheckmovies.com/movies/
        // https://www.icheckmovies.com/movies/?sort=title
        /icheckmovies\.com\/movies\/(?:$|\?)/,
    movieListSpecial: // /movies/checked/ etc.
        // https://www.icheckmovies.com/movies/favorited/
        // https://www.icheckmovies.com/movies/favorited/?sort=title
        // https://www.icheckmovies.com/movies/checked/
        // https://www.icheckmovies.com/movies/checked/?sort=title
        // https://www.icheckmovies.com/movies/unchecked/
        // https://www.icheckmovies.com/movies/owned/
        /icheckmovies\.com\/movies\/(?:((un)?checked|favorited|disliked|watchlist|owned|recommended)\/)/,
    movieSearch:
        // https://www.icheckmovies.com/search/movies/?query=inception
        /icheckmovies\.com\/search\/movies\//,
    movieRankings:
        // https://www.icheckmovies.com/movies/inception/rankings/
        // https://www.icheckmovies.com/movies/inception/rankings/?excludetags=user:icheckmovies
        /icheckmovies\.com\/movies\/[^/]+\/rankings\//,
    listsGeneral: // /lists/ only
        // https://www.icheckmovies.com/lists/
        // https://www.icheckmovies.com/lists/?sort=dateadded
        /icheckmovies\.com\/lists\/(?:$|\?)/,
    listsSpecial: // /lists/favorited/ etc.
        // https://www.icheckmovies.com/lists/favorited/
        // https://www.icheckmovies.com/lists/favorited/?sort=name
        /icheckmovies\.com\/lists\/(?:favorited|disliked|watchlist)\//,
    listsSearch:
        // https://www.icheckmovies.com/search/lists/?query=nolan
        /icheckmovies\.com\/search\/lists\//,
    progress:
        // https://www.icheckmovies.com/profiles/progress/
        /icheckmovies.com\/profiles\/progress\//,
});

const addToMovieListBar = htmlStr => {
    if (!document.querySelector('#icmeControls')) {
        const html = '<div id="icmeControls" style="height: 35px; position: relative"></div>';
        // movieList and movieListGeneral+Special use different headers
        const elMain = document.querySelector(':is(#topList, #listTitle) ~ .container:last-of-type');
        elMain.insertAdjacentHTML('beforebegin', html);
    }

    document.querySelector('#icmeControls').insertAdjacentHTML('beforeend', htmlStr);
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

    // Synchronize the loaded config with the module's options (delete outdated, add new)
    // and make it accessible to the module.
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
            script_info: {
                version: VERSION, // dot-separated string
                revision: verToNumber(VERSION), // 4-digit number
            },
        };

        const oldcfg = load('icm_enhanced');
        if (!oldcfg || !oldcfg.script_info) return;

        const oldInfo = oldcfg.script_info;
        const newInfo = this.data.script_info;
        // Rewrite script_info in the loaded config
        this.data = { ...oldcfg, script_info: newInfo };

        const isUpdated = oldInfo.revision !== newInfo.revision;
        if (isUpdated) {
            console.log(`Updating to ${newInfo.revision}`);
            this.save();
        }
    }

    save() {
        save('icm_enhanced', this.data);
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
            if (!(obj[part] instanceof Object)) obj[part] = {};
            obj = obj[part];
        }

        obj[last] = value;
    }

    // Set false to true and vice versa
    toggle(path) {
        const val = this.get(path);
        let toggled;

        if (val === true || val === false) {
            toggled = !val;
        } else if (val === 'asc' || val === 'desc') {
            toggled = val === 'asc' ? 'desc' : 'asc';
        } else {
            return false; // couldn't toggle the value
        }

        this.set(path, toggled);
        return true; // value has been toggled
    }
}

class ConfigWindow {
    constructor(globalCfg) {
        this.globalCfg = globalCfg;
        this.modules = [];
    }

    addModule(metadata) {
        if (!this.modules.some(m => m.id === metadata.id)) {
            this.modules.push(metadata);
        }
    }

    buildOptionHTML(path, opt) {
        let value = this.globalCfg.get(path); // always up to date
        // optValue can be a string (until a module parses it) or an array (after)
        if (Array.isArray(value)) {
            value = value.join('\n');
        }

        const attrPath = `data-cfg-path="${path}"`;
        const checkbox = () => `
            <p${opt.inline ? ' class="icmeCfgInlineOpt"' : ''}>
                ${opt.frontDesc ?? ''}
                <label>
                    <input type="checkbox" ${attrPath} ${value ? 'checked="checked"' : ''}
                        title="default: ${opt.default ? 'yes' : 'no'}">
                    ${opt.desc}
                </label>
            </p>`;
        const textinput = () => `
            <p>
                ${opt.desc}:
                <input type="text" ${attrPath} value="${value}" title="default: ${opt.default}">
            </p>`;
        const textarea = () => `
            <p>
                <span class="icmeCfgTextareaDesc">${opt.desc}:</span>
                <textarea rows="4" cols="70" ${attrPath}>${value}</textarea>
            </p>`;
        const textinputcolor = () => `
            <p>
                ${opt.desc}:
                <input type="text" class="icmeColorPickerText" ${attrPath}
                    value="${value}" title="default: ${opt.default}">
                <input type="color" class="icmeColorPicker" ${attrPath}
                    value="${value}" title="default: ${opt.default}">
            </p>`;

        const htmlByType = { checkbox, textinput, textarea, textinputcolor };
        return htmlByType[opt.type]();
    }

    loadOptions(index) {
        const { id, desc, options } = this.modules[index];
        const buildHTML = opt => this.buildOptionHTML(`${id}.${opt.id}`, opt);
        const html = `<p>${desc}</p> ${options.map(buildHTML).join('')}`;

        document.querySelector('#icmeCfgModule').innerHTML = html;
        ConfigWindow.initColorPickers();
    }

    static initColorPickers() {
        document.querySelectorAll('.icmeColorPicker').forEach(el => {
            el.addEventListener('change', () => {
                el.previousElementSibling.value = el.value;
            });
        });

        document.querySelectorAll('.icmeColorPickerText').forEach(el => {
            el.addEventListener('change', () => {
                el.nextElementSibling.value = el.value;
            });
        });
    }

    static css() {
        addCSS(`
            .jqmOverlay { background-color: #000; }
            #icmeCfgModal {
                font-family: verdana, arial, sans-serif;
                background-color: #fff;
                color: #000;
                padding: 12px 30px;

                display: none;
                position: absolute;
                top: 17%;
                left: 50%;
                margin-left: -400px;
                width: 800px;
                height: 450px;
            }
            #icmeCfgModal hr {
                border: 0;
                height: 1px;
                width: 100%;
                background-color: #aaa;
                margin: 7px 0px;
            }
            #icmeCfgModal h3 { color: #bbb; }
            #icmeCfgModule { margin: 10px 0; }
            #icmeCfgModule > p { margin-bottom: 0.5em; }
            #icmeCfgModule > p.icmeCfgInlineOpt { display: inline-block; margin-right: 5px }
            #icmeCfgModule input { margin: 0px 3px; }
            #icmeCfgModule input[type=text] { font-family: monospace }
            #icmeCfgModule .icmeCfgTextareaDesc { vertical-align: top; margin-right: 5px }
            #icmeCfgSave {
                position: absolute;
                bottom:15px;
                left: 30px
            }
        `);
    }

    load() {
        ConfigWindow.css();

        // Create and append a new item in the drop down menu under your username
        const cfgLink = `
            <li>
                <a id="icmeCfgLink" href="#"
                   title="Configure iCheckMovies Enhanced script options">ICM Enhanced</a>
            </li>`;

        document.querySelector('ul#profileOptions').insertAdjacentHTML('beforeend', cfgLink);

        this.modules.sort((a, b) => (a.title > b.title ? 1 : -1));
        const options = this.modules.map(m => `<option>${m.title}</option>`);
        const ver = this.globalCfg.data.script_info.version;

        const cfgMainHtml = `
            <div class="jqmWindow" id="icmeCfgModal">
                <h3>iCheckMovies Enhanced ${ver} configuration</h3>
                <select id="icmeCfgModuleList" name="modulelist">${options}</select>
                <hr>
                <div id="icmeCfgModule"></div>
                <button id="icmeCfgSave">Save settings</button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', cfgMainHtml);
        const elCfgModal = document.querySelector('#icmeCfgModal');
        const elSaveBtn = elCfgModal.querySelector('#icmeCfgSave');
        const elModuleList = elCfgModal.querySelector('#icmeCfgModuleList');

        elCfgModal.addEventListener('change', e => {
            if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const path = e.target.dataset.cfgPath;
            if (!path) return;

            if (!this.globalCfg.toggle(path)) {
                this.globalCfg.set(path, e.target.value);
            }

            elSaveBtn.disabled = false;
        });

        elSaveBtn.addEventListener('click', () => {
            this.globalCfg.save();
            elSaveBtn.disabled = true;
        });

        elModuleList.addEventListener('change', () => {
            this.loadOptions(elModuleList.selectedIndex);
        });

        elModuleList.dispatchEvent(new Event('change'));

        // initialize config window
        $('#icmeCfgModal').jqm({ trigger: 'a#icmeCfgLink' });
    }
}

// ----- Modules -----

class RandomFilmLink extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Random film link',
            desc: 'Show a "Help me pick a film" link on movie lists with unchecked movies.' +
                '<br>Suggestions don\'t repeat until all have been shown once. ' +
                'Click on the list tab\'s label to return to the full list.',
            id: 'random_film',
            enableOn: ['movieList', 'movieListSpecial'], // movieListGeneral doesn't make sense here
            options: [BaseModule.getStatus(true)],
        };

        this.randomIndices = [];
    }

    attach() {
        // Disable on completed lists and list of checked/favs.
        // If a user unchecks a movie, it will show up only after reloading
        if (!document.querySelectorAll('#itemListMovies > li.unchecked').length) return;

        const html =
            `<span style="float: right; margin-left: 15px">
                <a href="#" id="icmeRandomFilm">Help me pick a film!</a>
            </span>`;

        addToMovieListBar(html);

        document.querySelector('#icmeRandomFilm').addEventListener('click', e => {
            e.preventDefault();
            this.pickRandomFilm();
        });

        // Allow resetting visible movies on /movies/watchlist/ etc. by clicking on tab's label
        const elActiveTab = document.querySelector('.tabMenu > .active');
        if (!elActiveTab.querySelector('a')) {
            elActiveTab.addEventListener('click', () => {
                document.querySelectorAll('#itemListMovies > li').forEach(el => {
                    el.style.display = 'list-item';
                });
            });
        }
    }

    pickRandomFilm() {
        const elUnchecked = document.querySelectorAll('#itemListMovies > li.unchecked');
        if (!elUnchecked.length) return;

        if (!this.randomIndices.length) {
            this.randomIndices = [...Array(elUnchecked.length).keys()];
            RandomFilmLink.shuffle(this.randomIndices);
        }

        const selectedIndex = this.randomIndices.pop();

        document.querySelectorAll('#itemListMovies > li').forEach(el => {
            el.style.display = 'none';
        });
        elUnchecked[selectedIndex].style.display = 'list-item';
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
            desc: 'Show numbers of checks needed for getting awards on individual lists',
            id: 'ua_list',
            enableOn: ['movieList'],
            options: [BaseModule.getStatus(true), {
                id: 'show_negative',
                desc: 'Show negative values for received awards',
                type: 'checkbox',
                default: true,
            }],
        };
    }

    attach() {
        if (!document.querySelector('#itemListMovies')) return;

        const parseNum = sel => Number(document.querySelector(sel).textContent.match(/\d+/));
        const totalItems = parseNum('#listFilterMovies');
        const checks = parseNum('#topListMoviesCheckedCount');

        const getSpan = ([award, cutoff]) => {
            const neededForAward = Math.ceil(totalItems * cutoff) - checks;
            if (!this.config.show_negative && neededForAward <= 0) {
                return '';
            }

            return `<span style="margin-left: 30px">${award}: <b>${neededForAward}</b></span>`;
        };

        const awardTypes = [['Bronze', 0.5], ['Silver', 0.75], ['Gold', 0.9], ['Platinum', 1]];
        const html = `<span><b>Upcoming awards:</b>${awardTypes.map(getSpan).join('')}`;
        addToMovieListBar(html);
    }
}

class UpcomingAwardsOverview extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Upcoming awards overview',
            desc: 'Show a summary of upcoming awards on the progress page and watchlisted/fav. lists',
            id: 'ua',
            enableOn: ['listsSpecial', 'progress'],
            options: [BaseModule.getStatus(true)],
        };

        this.lists = [];
        this.hiddenLists = [];
    }

    attach() {
        if (!document.querySelector('.listItemToplist')) return;

        this.lists = [];
        this.hiddenLists = load('icme_hidden_lists') ?? [];

        this.lists = UpcomingAwardsOverview.parseLists();
        this.sortLists();
        UpcomingAwardsOverview.css();
        this.loadHtml();
        this.addListeners();
    }

    static parseLists() {
        // Use different selectors depending on the page
        const sel = {
            progress: { rank: 'span.rank', title: 'h3 > a' },
            lists: { rank: 'span.info > strong:first-of-type', title: 'h2 > a.title' },
        };
        const curSel = UpcomingAwardsOverview.matchesPageType('progress') ? sel.progress : sel.lists;
        const awardTypes = [['Platinum', 1], ['Gold', 0.9], ['Silver', 0.75], ['Bronze', 0.5]];

        const elLists = document.querySelectorAll('#progressall > li, #itemListToplists > li');
        return [...elLists].flatMap(el => {
            const counts = el.querySelector(curSel.rank).textContent.match(/\d+/g);
            if (!counts) return [];

            const [checks, totalItems] = counts.map(Number);
            const elTitle = el.querySelector(curSel.title);
            const listTitle = elTitle.title.replace(/^View the | top list$/g, '');
            const listUrl = elTitle.href;

            const apply = cutoff => Math.ceil(totalItems * cutoff) - checks;
            return awardTypes
                .map(([awardType, cutoff]) => ({ awardType, neededForAward: apply(cutoff) }))
                .filter(({ neededForAward }) => neededForAward > 0)
                .map(obj => ({ ...obj, listTitle, listUrl }));
        });
    }

    sortLists() {
        // By least required checks ASC, then by award type DESC, then by list title ASC
        const awardOrder = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
        this.lists.sort((a, b) =>
            a.neededForAward - b.neededForAward ||
            awardOrder[b.awardType] - awardOrder[a.awardType] ||
            a.listTitle.localeCompare(b.listTitle));
    }

    static css() {
        const unhideIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAA' +
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
        const hideIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQC' +
            'AYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AA' +
            'IDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAE+SURBVHja1JO/SsNwEMc/P7Fos2TqE1joL' +
            'B3EpRQaobsUAj6AL9C9ce8L+ACOTlkKUiglIA5iHqAdOndpk9Ik/QXO4SeSSAShkwdf7' +
            'nf3uzvurxIRjqETjqSjA5yWpPsbAA8YAeqHrQAPgMfjS3UGudZervUIxyHXWnAciu9c6' +
            '1GutVf0UcUmJnfXUu/3jXB+TjafA3DW6UCaGpvJhPrTq6oMsL29BBC71zOKRsPw9dr8T' +
            '6cAyn7+qC4hSxJs11WbIIAoguXSIIrYBAG266osSX6fQrbfA3DY7cCyYLs1sCyjK9hUl' +
            'rC4agBIcziE2aw8g26XxXgMoJpv6+oMDmlqnH0f4phVGLIKQ4hj8H2awyGHNC2vroh8I' +
            '2zVvLBVExm05YsjgzZFXdiqeUWfUgnvF+pPi9ReSnUP/ucxfQ4ASu+wNb1N4vcAAAAAS' +
            'UVORK5CYII=';

        addCSS(`
            #icmeUAO {
                z-index: 0;
                position: relative;
                margin-top: 0;
                margin-bottom: 20px;
            }
            #icmeUAOTableContainer {
                position: relative;
                top: 0;
                width: 830px;
                height: 240px;
                overflow: scroll;
            }
            #icmeUAOTableToggleContainer {
                position: relative;
                left: 0;
                top: 0;
                width: 200px;
            }
            #icmeUAOLinks {
                position: absolute;
                right: 0;
                top: 0;
                font-weight: bold;
            }
            .icmeAward td:nth-child(1) { width: 65px; }
            .icmeAward td:nth-child(2) { width: 65px; }
            .icmeAward td:nth-child(3) div { height: 28px; overflow: hidden; }
            .icmeAward td:nth-child(4) { width: 70px; }
            .icmeAward.icmeHidden { display: none; }
            .icmeToggleList {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .icmeAward.icmeHidden .icmeToggleList { background-image: url(${unhideIcon}); }
            .icmeAward:not(.icmeHidden) .icmeToggleList { background-image: url(${hideIcon}); }
        `);
    }

    loadHtml() {
        const html = `
            <div id="icmeUAO">
                <p id="icmeUAOTableToggleContainer">
                    <a id="icmeUAOTableToggle" href="#">
                        <span style="display: none">Show upcoming awards</span>
                        <span>Hide upcoming awards</span>
                    </a>
                </p>
                <p id="icmeUAOLinks">
                    Display: <a id="icmeShowAll" href="#">All</a>,
                    <a class="icmeShowAward" href="#">Bronze</a>,
                    <a class="icmeShowAward" href="#">Silver</a>,
                    <a class="icmeShowAward" href="#">Gold</a>,
                    <a class="icmeShowAward" href="#">Platinum</a>,
                    <a id="icmeShowHidden" href="#">Hidden</a>,
                    <a id="icmeToggleSize" href="#">
                        <span style="display: none">Minimize full list</span>
                        <span>Show full list</span>
                    </a>
                </p>
                <div id="icmeUAOTableContainer" class="container">
                    <table id="icmeAwardTable">
                        <thead>
                            <tr>
                                <th>Awards</th>
                                <th>Checks</th>
                                <th>List title</th>
                                <th>(Un)Hide</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
            </div>`;

        const sel = UpcomingAwardsOverview.matchesPageType('progress') ? '#listOrdering' : '#itemContainer';
        document.querySelector(sel).insertAdjacentHTML('beforebegin', html);

        const htmlAwards = this.lists.map(el => {
            const isHidden = this.hiddenLists.includes(el.listUrl);

            return `
                <tr class="icmeAward ${isHidden ? 'icmeHidden' : ''}"
                        data-award-type="${el.awardType}" data-list-url="${el.listUrl}">
                    <td>${el.awardType}</td>
                    <td>${el.neededForAward}</td>
                    <td>
                        <div>
                            <a class="icmeListTitle" href="${el.listUrl}">${el.listTitle}</a>
                        </div>
                    </td>
                    <td>
                        <div class="icmeToggleList" title="Toggle the list's visibility"></div>
                    </td>
                </tr>`;
        }).join('');

        document.querySelector('#icmeAwardTable tbody').insertAdjacentHTML('beforeend', htmlAwards);
    }

    addListeners() {
        const elAwards = [...document.querySelectorAll('.icmeAward')];

        document.querySelector('#icmeAwardTable tbody').addEventListener('click', e => {
            if (!e.target.classList.contains('icmeToggleList')) return;
            e.preventDefault();

            const { listUrl } = e.target.closest('.icmeAward').dataset;
            const index = this.hiddenLists.indexOf(listUrl);
            const isVisible = index === -1;

            if (isVisible) {
                this.hiddenLists.push(listUrl);
            } else {
                this.hiddenLists.splice(index, 1);
            }

            elAwards
                .filter(el => el.dataset.listUrl === listUrl)
                .forEach(el => { el.classList.toggle('icmeHidden'); });

            save('icme_hidden_lists', this.hiddenLists);
        });

        document.querySelector('#icmeShowHidden').addEventListener('click', e => {
            e.preventDefault();
            elAwards.forEach(el => {
                el.style.display = el.classList.contains('icmeHidden') ? 'table-row' : 'none';
            });
        });

        const elToggle = document.querySelector('#icmeUAOTableToggle');
        elToggle.addEventListener('click', e => {
            e.preventDefault();

            const els = document.querySelectorAll('#icmeUAOLinks, #icmeUAOTableContainer');
            [...els, ...elToggle.children].forEach(el => {
                el.style.display = el.style.display === 'none' ? '' : 'none';
            });
        });

        document.querySelector('#icmeShowAll').addEventListener('click', e => {
            e.preventDefault();
            elAwards.forEach(aw => {
                aw.style.display = '';
            });
        });

        document.querySelectorAll('.icmeShowAward').forEach(el => el.addEventListener('click', e => {
            e.preventDefault();

            const awardType = el.textContent.trim();
            elAwards.forEach(aw => {
                const isVisible = !aw.classList.contains('icmeHidden');
                const matchesType = aw.dataset.awardType === awardType;
                aw.style.display = isVisible && matchesType ? '' : 'none';
            });
        }));

        const elToggleSize = document.querySelector('#icmeToggleSize');
        const elContainer = document.querySelector('#icmeUAOTableContainer');
        elToggleSize.addEventListener('click', e => {
            e.preventDefault();

            elContainer.style.height = elContainer.style.height === 'auto' ? '240px' : 'auto';
            [...elToggleSize.children].forEach(el => {
                el.style.display = el.style.display === 'none' ? '' : 'none';
            });
        });
    }
}

class CustomMovieColors extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Custom movie colors',
            desc: 'Set movie colors on lists for your favs/watchlist/dislikes',
            id: 'movie_colors',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial', 'movieSearch',
                'listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'favorite',
                desc: 'Favorites',
                type: 'textinputcolor',
                default: '#ffdda9',
            }, {
                id: 'watchlist',
                desc: 'Watchlist',
                type: 'textinputcolor',
                default: '#ffffd6',
            }, {
                id: 'disliked',
                desc: 'Disliked',
                type: 'textinputcolor',
                default: '#ffad99',
            }],
        };
    }

    attach() {
        const colors = [
            ['favorite', this.config.favorite],
            ['watch', this.config.watchlist],
            ['hated', this.config.disliked]];

        const buildCSS = ([className, color]) => {
            const sel = `#itemListMovies li.${className}`;
            return `${sel}, ${sel} ul.optionIconMenu { background-color: ${color} !important; }`;
        };

        addCSS(colors.map(buildCSS).join(''));
    }
}

class ListCrossRef extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Cross-reference lists',
            desc: 'Cross-reference lists to find which movies they share',
            id: 'list_cross_ref',
            enableOn: ['listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'match_all',
                desc: 'Find movies that appear on all selected lists',
                type: 'checkbox',
                default: false,
            }, {
                id: 'match_min',
                desc: 'Otherwise, find movies that appear on at least N lists (N > 1)',
                type: 'textinput',
                default: 2,
            }, {
                id: 'unchecked_only',
                desc: 'Find only unchecked movies',
                type: 'checkbox',
                default: true,
            }],
        };
    }

    attach() {
        if (!document.querySelector('#itemListToplists')) return;

        const htmlActions = `
            <div id="icmeCRActions">
                Cross-reference lists:
                <button id="icmeCRStartSel">Start selection</button>
                <button id="icmeCRCancelSel">Cancel selection</button>
                <button id="icmeCRRun">Run</button>
            </div>`;
        document.querySelector('#itemContainer').insertAdjacentHTML('beforebegin', htmlActions);

        addCSS(`
            #icmeCRActions { margin-bottom: 18px; }
            #icmeCRCancelSel, #icmeCRRun { display: none; }
            .icmeCRSelected, .icmeCRSelected .progress {
                background-color: #bbbbbb !important;
            }
            .icmeCRHover, .icmeCRHover .progress {
                background-color: #cccccc !important;
            }
            .icmeCRPending, .icmeCRPending .progress {
                background-color: #ffffb2 !important;
            }
        `);

        this.selectionStarted = false;
        this.attachSelectionHandlers();
        const [elStart, elCancel, elRun] = document.querySelectorAll('#icmeCRActions button');
        elStart.addEventListener('click', () => {
            elStart.style.display = 'none';
            elCancel.style.display = 'inline';
            elRun.style.display = 'inline';
            this.selectionStarted = true;
        });

        elCancel.addEventListener('click', () => {
            elStart.style.display = '';
            elCancel.style.display = '';
            elRun.style.display = '';
            this.selectionStarted = false;
            document.querySelectorAll('.icmeCRSelected, .icmeCRHover').forEach(el => {
                el.classList.remove('icmeCRSelected', 'icmeCRHover');
            });
        });

        elRun.addEventListener('click', () => {
            elCancel.disabled = true;
            elRun.disabled = true;
            this.selectionStarted = false;
            this.run().then(() => {
                elCancel.disabled = false;
                elRun.disabled = false;
                elStart.style.display = '';
                elCancel.style.display = '';
                elRun.style.display = '';
            });
        });
    }

    attachSelectionHandlers() {
        const eventTypes = ['click', 'mouseover', 'mouseout'];
        const elLists = document.querySelector('#itemListToplists');
        for (const type of eventTypes) {
            elLists.addEventListener(type, e => {
                const elList = e.target.closest('.listItemToplist');
                if (!this.selectionStarted || !elList) return;

                if (e.type === 'mouseover') {
                    elList.classList.add('icmeCRHover');
                } else if (e.type === 'mouseout') {
                    elList.classList.remove('icmeCRHover');
                } else if (e.type === 'click') {
                    elList.classList.toggle('icmeCRSelected');
                }
            });
        }
    }

    async run() {
        const elLists = [...document.querySelectorAll('.icmeCRSelected')];
        const results = await this.fetchMovies(elLists);

        const counter = {};
        results.forEach(elMovies => ListCrossRef.updateCounter(elMovies, counter));

        this.output(elLists, counter);
    }

    async fetchMovies(elLists) {
        const sel = `#itemListMovies > li${this.config.unchecked_only ? '.unchecked' : ''}`;
        const results = [];
        for (const elList of elLists) {
            const url = elList.querySelector('a.title').href;
            elList.classList.add('icmeCRPending');

            /* eslint-disable no-await-in-loop -- Load pages one by one to reduce the load */
            const elMovies = await extractFrom(url, el => el.querySelectorAll(sel));
            results.push(elMovies);
            await sleep(500);
            /* eslint-enable no-await-in-loop */

            elList.classList.remove('icmeCRPending', 'icmeCRSelected');
        }

        return results;
    }

    static updateCounter(elMovies, counter) {
        elMovies.forEach(elMovie => {
            const { id } = elMovie;
            if (counter[id]) {
                counter[id].count += 1;
                return;
            }

            // Compatibility with the NewTabs module
            const owned = load('icme_owned_movies') ?? {};
            if (owned[id]) {
                elMovie.classList.remove('notowned');
                elMovie.classList.add('owned');
            }

            const elTitle = elMovie.querySelector('h2 a');
            const title = elTitle.textContent.trim();
            const url = elTitle.href;
            const year = elMovie.querySelector('.info > a:first-of-type').textContent;

            counter[id] = { count: 1, title, url, year, el: elMovie };
        });
    }

    output(elLists, counter) {
        let cutoff = this.config.match_all ? elLists.length : this.config.match_min;
        cutoff = Math.max(2, cutoff); // doesn't make sense to have a cutoff lower than 2
        const isOnEnoughLists = id => counter[id].count >= Math.max(2, cutoff);
        const movies = Object.keys(counter).filter(isOnEnoughLists).map(k => counter[k]);

        // Sort by checks DESC, then by year ASC, then by title ASC
        movies.sort((a, b) =>
            b.count - a.count || a.year - b.year || a.title.localeCompare(b.title));

        // Collapse visible lists from previous runs
        document.querySelectorAll('.topListMoviesFilter.active a').forEach(el => el.click());

        const listTitles = elLists.map(el => `
            <li><b>${el.querySelector('h2').textContent.trim()}</b></li>
        `);
        document.querySelector('#itemContainer').insertAdjacentHTML('afterend', `
            <div class="icmeCRResults">
                ${movies.length} ${this.config.unchecked_only ? 'unchecked' : ''} movies
                appear on ${this.config.match_all ? 'all' : `at least ${cutoff}`} of these lists:
                <ul>${listTitles.join('')}</ul>
            </div>
        `);

        if (!movies.length) return;

        const elResults = document.querySelector('.icmeCRResults');
        elResults.insertAdjacentHTML('beforeend', `
            <ul class="tabMenu tabMenuPush">
                <li class="topListMoviesFilter active">
                    <a href="#" title="View all movies">All (${movies.length})</a>
                </li>
                <li class="icmeCRExport">
                    <a href="#" title="Export all movies in CSV format">Export CSV</a>
                </li>
            </ul>
            <ol id="itemListMovies" class="itemList listViewNormal"></ol>
        `);

        // Target only the topmost list (in case there are several)
        const elMovieList = elResults.querySelector('#itemListMovies');
        for (const movie of movies) {
            movie.el.querySelector('.rank').innerHTML = movie.count;
            movie.el.style.display = ''; // movies from fetched lists might be hidden
            elMovieList.append(movie.el);
        }

        // Make movie lists collapsible
        elResults.querySelector('.topListMoviesFilter a').addEventListener('click', e => {
            e.preventDefault();
            const elMovieFilter = e.target.parentElement;
            elMovieFilter.classList.toggle('active');
            elMovieList.style.display = elMovieFilter.classList.contains('active') ? '' : 'none';
        });

        // Allow exporting results as a .csv file
        const elExport = elResults.querySelector('.icmeCRExport a');
        const filename = 'Cross-referencing results';
        const { delimiter, bom } = this.globalCfg.data.export_lists;
        // eslint-disable-next-line no-use-before-define
        ExportLists.export(elExport, elMovieList.children, filename, delimiter, bom);
    }
}

class HideTags extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Hide tags',
            desc: 'Hide tags on movie lists and lists of lists in normal view',
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
                id: 'show_on_hover',
                desc: 'Show tags when moving the cursor over a movie or a list',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.list_tags) {
            // /lists/ and /movies/<title>/rankings/ have different structure
            addCSS(`
                #itemListToplists.listViewNormal > li > .info:last-child,
                #itemListToplists > li > .tagList {
                    display: none !important;
                }
            `);
        }

        if (this.config.movie_tags) {
            addCSS(`
                #itemListMovies.listViewNormal > li > .tagList {
                    display: none !important;
                }
            `);
        }

        if (this.config.show_on_hover) {
            addCSS(`
                #itemListToplists.listViewNormal > li:hover > .info:last-child,
                #itemListMovies.listViewNormal > li:hover > .tagList {
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
            desc: 'Add additional tabs on movie lists',
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
                id: 'wlist_tab',
                desc: 'watchlisted movies',
                type: 'checkbox',
                inline: true,
                default: false,
            }, {
                id: 'free_account',
                desc: 'Store owned movies (emulates the paid feature; ' +
                    'enable only if you have a free account)',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.free_account) {
            this.trackOwned();
        }

        if (NewTabs.matchesPageType('movieList') && (this.config.wlist_tab || this.config.owned_tab)) {
            NewTabs.prepareTabBar();
            if (this.config.wlist_tab) NewTabs.addNewTab('watch', 'watchlist');
            if (this.config.owned_tab) NewTabs.addNewTab('owned', 'owned');
        }
    }

    static prepareTabBar() {
        // Gain some extra space in the tab bar
        const elAllTab = document.querySelector('#listFilterMovies a');
        elAllTab.textContent = elAllTab.textContent.replace(' movies', '');

        // Move the 'order by' and view switch elements to the list title
        document.querySelector('#topList').insertAdjacentHTML('beforeend', `
            <div id="icmeOrderByAndView"></div>
        `);
        addCSS(`
            #icmeOrderByAndView {
                z-index: 200;
                position: absolute;
                top: 30px;
                right: 0;
                width: 300px;
                height: 20px;
            }
        `);
        const elOrderBy = document.querySelector('#listOrdering');
        const elView = document.querySelector('#listViewswitch');
        document.querySelector('#icmeOrderByAndView').append(elOrderBy, elView);
    }

    static addNewTab(itemClass, title) {
        const elMovieList = document.querySelector('#itemListMovies');
        title = title.toLowerCase();
        const titleCap = title[0].toUpperCase() + title.slice(1);
        const count = elMovieList.querySelectorAll(`:scope > li.${itemClass}`).length;
        const tabHtml = `
            <li id="listFilter${titleCap}" class="topListMoviesFilter">
                <a title="View all your ${title} movies" href="#">
                    ${titleCap}
                    <span id="topListMovies${titleCap}Count">(${count})</span>
                </a>
            </li>`;

        document.querySelector('#listFilterNew').insertAdjacentHTML('beforebegin', tabHtml);

        const elTabLink = document.querySelector(`#listFilter${titleCap} a`);
        elTabLink.addEventListener('click', e => {
            e.preventDefault();
            elMovieList.querySelectorAll(':scope > li.listItem')
                .forEach(el => { el.style.display = 'none'; });
            elMovieList.querySelectorAll(`:scope > li.${itemClass}`)
                .forEach(el => { el.style.display = ''; });
            document.querySelector('#topListAllMovies').style.display = 'none'; // hide 'Show all'

            const elTab = elTabLink.parentElement;
            elTab.parentElement.querySelector('.active').classList.remove('active');
            elTab.classList.add('active');
        });
    }

    trackOwned() {
        const owned = load('icme_owned_movies') ?? {};

        const elMarkOwnedArr = document.querySelectorAll('.optionMarkOwned');
        elMarkOwnedArr.forEach(elMarkOwned => {
            const elCheckbox = elMarkOwned.closest('.optionIconMenu').previousElementSibling;
            const elMovie = elCheckbox.parentElement;
            const id = elCheckbox.id.replace('check', 'movie');

            if (owned[id]) {
                elMovie.classList.remove('notowned');
                elMovie.classList.add('owned');
            }

            // Remove the paid feature pop-up using two ways to unbind events from the button
            // (only one is not enough because TM/VM launch the script at different times)
            const elMarkOwnedClone = elMarkOwned.cloneNode(true);
            elMarkOwned.replaceWith(elMarkOwnedClone);
            elMarkOwned = elMarkOwnedClone;
            elMarkOwned.classList.remove('paidFeature');

            elMarkOwned.addEventListener('click', e => {
                e.preventDefault();
                // ICM intercepts clicks by the class name, throwing an error in the console
                e.stopPropagation();

                // Storage could've changed in the meanwhile in other tabs
                const ownedFresh = load('icme_owned_movies') ?? {};
                if (ownedFresh[id]) {
                    delete ownedFresh[id];
                } else {
                    ownedFresh[id] = true;
                }

                elMovie.classList.toggle('notowned');
                elMovie.classList.toggle('owned');

                if (NewTabs.matchesPageType('movieList') && this.config.owned_tab) {
                    const ownedCount = document.querySelectorAll('#itemListMovies li.owned').length;
                    const elTabLabelCount = document.querySelector('#topListMoviesOwnedCount');
                    elTabLabelCount.textContent = `(${ownedCount})`;
                }

                save('icme_owned_movies', ownedFresh);
            });
        });
    }
}

class LargePosters extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Large posters',
            desc: 'Show large posters on individual lists (replaces normal view)',
            id: 'large_posters',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'default_view',
                desc: 'Use as the default list view',
                type: 'checkbox',
                default: false,
            }, {
                id: 'noinfo',
                desc: 'Hide info (title, year, lists)',
                type: 'checkbox',
                default: false,
            }],
        };
    }

    attach() {
        if (this.config.default_view) {
            this.load();
            return;
        }

        const link = `
            <span style="float: right; margin-left: 15px">
                <a id="icmeLPLink" href="#">Large posters</a>
            </span>`;

        addToMovieListBar(link);

        const elLink = document.querySelector('#icmeLPLink');
        elLink.addEventListener('click', e => {
            e.preventDefault();
            this.load();
            elLink.remove();
        });
    }

    load() {
        const root = '#itemListMovies.listViewNormal';
        let css = `
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
            ${root}.icmeLPNoInfo :is(h2, .tagList, .info) { display: none; }
            ${root}.icmeLPNoInfo .listItem { height: 270px; }
            #itemListMovies.listViewCompact > .listItem { height: auto; }
        `;
        css = css.replace(/;/g, ' !important;');
        addCSS(css);

        // Normal view is used as the basis for the large posters view
        LargePosters.enableNormalView();

        document.querySelectorAll('#itemListMovies div.coverImage').forEach(elCover => {
            elCover.style.display = 'none';
            const imgUrl = elCover.style.backgroundImage.split('"')[1].replace(/small/i, 'medium');
            const imgHtml = `<img class="coverImage" src="${imgUrl}" loading="lazy">`;
            elCover.insertAdjacentHTML('afterend', imgHtml);
        });

        if (this.config.noinfo) {
            document.querySelector('#itemListMovies').classList.add('icmeLPNoInfo');
        } else {
            // Imitate click on the 'Show all' button
            document.querySelectorAll('#itemListMovies > .listItem')
                .forEach(el => { el.style.display = ''; });
            document.querySelector('#topListAllMovies').style.display = 'none';
            // Tags and long titles (if they are shown) can increase item's height
            LargePosters.adjustHeights();
        }
    }

    static enableNormalView() {
        const [elNormalView, elCompactView] = document.querySelectorAll('#listViewswitch a');
        if (elNormalView.classList.contains('active')) return;
        // Modified from ICM source code (triggering the click event requires @run-at document-idle)
        elCompactView.classList.remove('active');
        elNormalView.classList.add('active');
        const elList = document.querySelector('.itemList');
        elList.classList.replace('listViewCompact', 'listViewNormal');
    }

    static adjustHeights() {
        const getHeight = el => parseFloat(getComputedStyle(el).height);
        document.querySelectorAll('.listItemMovie:nth-child(3n-2)').forEach(el1 => {
            const el2 = el1.nextElementSibling ?? el1;
            const el3 = el2.nextElementSibling ?? el1;

            const maxHeight = Math.max(...[el1, el2, el3].map(getHeight));
            [el1, el2, el3].forEach(el => {
                el.style.height = `${maxHeight}px`;
            });
        });
    }
}

class ProgressPage extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Progress page',
            desc: 'Change the order of lists on the progress page',
            id: 'progress_page',
            enableOn: ['progress'],
            options: [BaseModule.getStatus(false), {
                id: 'sort_by_completion',
                frontDesc: '',
                desc: 'Sort lists by completion rate',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'desc_order',
                desc: 'in descending order',
                type: 'checkbox',
                inline: true,
                default: true,
            }, {
                id: 'left_to_right',
                desc: 'Fill columns from left to right',
                type: 'checkbox',
                default: false,
            }, {
                id: 'single_col',
                desc: 'Show as a single column',
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
            addCSS('.itemList .listItem.listItemProgress { float: none !important; }');
        }

        const order = this.config.desc_order === true ? 'desc' : 'asc';
        this.rearrange(order, 'all');

        const elFilters = document.querySelectorAll('#progressFilter [id^=progressFilter-]');
        elFilters.forEach(el => el.addEventListener('click', () => {
            const [, section] = el.id.split('-');
            this.rearrange(order, section);
        }));
    }

    rearrange(order, section) {
        const elContainer = document.querySelector(`#progress${section}`);
        let elLists = [...elContainer.children];
        elLists.forEach(el => el.remove());

        elLists = ProgressPage.straighten(elLists);

        if (this.config.hide_imdb && section === 'all') {
            elLists = elLists.filter(el => !el.classList.contains('imdb'));
        }

        if (this.config.sort_by_completion) {
            const getWidth = el => parseFloat(el.querySelector('.progress').style.width);
            const widths = new Map(elLists.map(el => [el, getWidth(el)]));
            elLists.sort((a, b) => (order === 'asc' ? 1 : -1) * (widths.get(a) - widths.get(b)));
        }

        if (!this.config.single_col && !this.config.left_to_right) {
            // Restore default two-column view
            elLists = ProgressPage.interweave(elLists);
        }

        elContainer.append(...elLists);
    }

    // [1, 'a', 2, 'b', 3, 'c']    -> [1, 2, 3, 'a', 'b', 'c']
    // [1, 'a', 2, 'b', 3, 'c', 4] -> [1, 2, 3, 4, 'a', 'b', 'c']
    static straighten(list) {
        const even = list.filter((_, i) => i % 2 === 0);
        const odd = list.filter((_, i) => i % 2 !== 0);
        return [...even, ...odd];
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
}

class GroupMovieLists extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Group movie lists',
            desc: 'Organize movie info tab with all lists (/movies/*/rankings/, ' +
                '<a href="/movies/pulp+fiction/rankings/">example</a>)',
            id: 'group_movie_lists',
            enableOn: ['movieList', 'movieListGeneral', 'movieListSpecial',
                'movieRankings', 'movieSearch', 'listsGeneral', 'listsSpecial'],
            options: [BaseModule.getStatus(true), {
                id: 'redirect',
                desc: 'Redirect "In # lists" links to all lists (instead of only official lists)',
                type: 'checkbox',
                default: true,
            }, {
                id: 'sort_official',
                frontDesc: 'Move to the top: ',
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
                desc: 'lists from user-defined groups',
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

        this.elContainer = document.querySelector('#itemListToplists');
        // multiline regex that leaves only list name, excl. a common beginning and parameters
        this.reURL = /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:icheckmovies.com)?\/?(?:lists)?\/?([^?\s]+\/)(?:\?.+)?[ \t]*$/gm;
    }

    attach() {
        if (GroupMovieLists.matchesPageType('movieRankings')) this.reorderLists();
        if (!this.config.redirect) return;
        GroupMovieLists.fixLinks();
        this.fixLinksInNewNodes();
    }

    reorderLists() {
        addCSS(`
            .icmeGMLGroupEnd:not(:last-child) {
                margin-bottom: 25px;
                border-bottom: 2px solid #555;
            }
        `);

        const lists = [...this.elContainer.children];

        if (this.config.sort_official) {
            // icm bug: deleted lists reset to icheckmovies user
            const official = lists.filter(el =>
                el.querySelector('.tagList a[href$="user%3Aicheckmovies"]') &&
                !el.querySelector('.title').href.endsWith('//'));
            this.move(official);
        }

        if (this.config.sort_groups) {
            for (const group of ['group1', 'group2']) {
                let groupUrls = this.config[group];
                if (typeof groupUrls === 'string') { // Parse textarea content
                    console.log('Parsing GroupMovieLists group', group);
                    groupUrls = groupUrls.trim().replace(this.reURL, '$1').split('\n');
                    this.config[group] = groupUrls;
                    this.globalCfg.save();
                }

                const getShortUrl = el => el.querySelector('a.title').pathname.slice(7);
                const personal = lists.filter(el => groupUrls.includes(getShortUrl(el)));
                this.move(personal);
            }
        }

        if (this.config.sort_filmos) {
            const filmos = lists.filter(el => el.textContent.toLowerCase().includes('filmography'));
            this.move(filmos);
        }
    }

    move(elLists) {
        if (!elLists.length) return;
        const elGroupEnds = this.elContainer.querySelectorAll('.icmeGMLGroupEnd');
        if (elGroupEnds.length) {
            elGroupEnds[elGroupEnds.length - 1].after(...elLists);
        } else {
            this.elContainer.prepend(...elLists);
        }

        elLists[elLists.length - 1].classList.add('icmeGMLGroupEnd');
    }

    static fixLinks(elContainer = document) {
        const elLinksToLists = elContainer.querySelectorAll('.listItemMovie .info a:last-of-type');
        elLinksToLists.forEach(el => {
            el.href = el.href.replace('?tags=user:icheckmovies', '');
        });
    }

    // Cross-referencing adds new blocks that must also be fixed
    fixLinksInNewNodes() {
        const onListOfLists = GroupMovieLists.matchesPageType(['listsGeneral', 'listsSpecial']);
        const isCREnabled = this.globalCfg.data.list_cross_ref.enabled;
        if (!onListOfLists || !isCREnabled) return;
        const mut = new MutationObserver(mutList => mutList.forEach(({ addedNodes }) => {
            for (const el of addedNodes) {
                if (el.classList?.contains('icmeCRResults')) {
                    GroupMovieLists.fixLinks(el);
                }
            }
        }));
        mut.observe(document.querySelector('#icmeCRActions').parentElement, { childList: true });
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
        const elExport = document.querySelector('.optionExport');
        elExport.href = '#';
        const elMovies = document.querySelectorAll('#itemListMovies > li');
        const filename = document.querySelector(':is(#topList, #listTitle) > h1').textContent;
        ExportLists.export(elExport, elMovies, filename, this.config.delimiter, this.config.bom);
    }

    static export(elExport, elMovies, filename, sep, useBom) {
        if (sep !== ',' && sep !== ';') sep = '\t';
        const wrap = field => (field.includes('"') || field.includes(sep) ?
            `"${field.replace(/"/g, '""')}"` : field);
        const colNames = ['rank', 'title', 'aka', 'year', 'official_toplists',
            'checked', 'favorite', 'dislike', 'imdb'];
        elExport.addEventListener('click', () => {
            const rows = [...elMovies].map(el => {
                const rank = el.querySelector('.rank').textContent.match(/\d+/)[0];
                const title = wrap(el.querySelector('h2 > a').textContent);
                const aka = wrap(el.querySelector('.info > em')?.textContent ?? '');
                const year = el.querySelector('.info > a:first-of-type')?.textContent ?? '';
                const toplists = el.querySelector('.info > a:nth-of-type(2)').textContent.match(/\d+/)[0];
                const checked = el.classList.contains('checked') ? 'yes' : 'no';
                const isFav = el.classList.contains('favorite') ? 'yes' : 'no';
                const isDislike = el.classList.contains('hated') ? 'yes' : 'no';
                const imdbUrl = el.querySelector('.optionIMDB').href;
                const cols = [rank, title, aka, year, toplists, checked, isFav, isDislike, imdbUrl];
                return `${cols.join(sep)}`;
            });
            const data = `${colNames.join(sep)}\n${rows.join('\n')}`;
            // For Excel compat: BOM, ; or , as separator and no sep=
            const bom = useBom ? '\uFEFF' : '';

            elExport.href = `data:text/csv;charset=utf-8,${bom}${encodeURIComponent(data)}`;
            elExport.download = `${filename}.csv`;
        });
    }
}

class ProgressTopX extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Progress: checks to get into Top-1000',
            desc: 'Find out how many checks you need to get into Top-25/50/100/1000/...' +
                '<br>Adds a link to the progress page that will attach this number to each list.',
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
        addCSS(`#icmePTXLink {
            float: left;
            margin-right: 1em;
        }`);
        const targetRank = Number(this.config.target_page) * 25;
        const html = `<a id="icmePTXLink" href="#">Checks to get into Top-${targetRank}</a>`;
        document.querySelector('#listOrderingWrapper').insertAdjacentHTML('afterbegin', html);
        const elLink = document.querySelector('#icmePTXLink');
        // Can't pass the value directly in case of user changing it and not reloading
        elLink.addEventListener('click', event => this.addStats(event));
    }

    addStats(event) {
        event.preventDefault();
        const targetPage = Number(this.config.target_page); // * 25 = target rank
        const elActiveTab = [...document.querySelectorAll('.itemListCompact[id^="progress"]')]
            .filter(el => el.style.display !== 'none')[0];
        const lists = [...elActiveTab.children].map(elList => ({
            elTarget: elList.querySelector('.rank'),
            listUrl: elList.querySelector('.title').href,
            checks: Number(elList.querySelector('.rank').textContent.match(/\d+|-/g)[0]),
            rank: Number(elList.querySelector('.rank').textContent.match(/\d+|-/g)[2]),
        }));

        const getMinChecksFromTopusersPage = el => {
            const elLastProfile = el.querySelector('.listItemProfile:last-child');
            return Number(elLastProfile.querySelector('.info strong').textContent);
        };

        lists.forEach(async ({ elTarget, listUrl, checks, rank }) => {
            if (rank < targetPage * 25) return; // don't skip NaNs for lists with 0 checks
            // Pages higher than the last available page return the last page
            const url = `${listUrl}topusers/?page=${targetPage}`;
            const minChecks = await extractFrom(url, getMinChecksFromTopusersPage);
            const dif = minChecks - checks;

            const elText = elTarget.childNodes[0];
            elText.remove();
            elTarget.insertAdjacentHTML('afterbegin', `
                <a href="${url}" title="Checks needed to get into Top-${targetPage * 25}">
                    ${elText.textContent} - ${dif}
                </a>
            `);
        });
    }
}

class QuickListReorder extends BaseModule {
    constructor(globalCfg) {
        super(globalCfg);

        this.metadata = {
            title: 'Quick list reordering',
            desc: 'Double-click a list\'s rank to edit it. ' +
                'Hit Enter key or click outside to move the list to that position.',
            id: 'quick_list_reorder',
            enableOn: ['listsSpecial'],
            options: [BaseModule.getStatus(true)],
        };
    }

    attach() { // eslint-disable-line class-methods-use-this
        let oldRank;
        const elContainer = document.querySelector('#itemListToplists');

        elContainer.addEventListener('dblclick', e => {
            if (!e.target.matches('.rank')) return;
            e.target.contentEditable = 'true';
            e.target.focus();
            oldRank = Number(e.target.textContent.trim());
        });

        elContainer.addEventListener('keydown', e => {
            if (!e.target.matches('.rank') || e.which !== 13) return;
            e.target.blur(); // sends the 'focusout' event
        });

        elContainer.addEventListener('focusout', e => {
            if (!e.target.matches('.rank')) return;
            const newRank = Number(e.target.textContent.trim());
            QuickListReorder.moveList(oldRank, newRank, e.target, elContainer);
        });
    }

    static moveList(oldRank, newRank, elRank, elContainer) {
        const inProperRange = newRank > 0 && newRank <= elContainer.children.length;
        if (!newRank || !inProperRange || newRank === oldRank) {
            elRank.textContent = oldRank;
            return;
        }

        const elList = elRank.closest('.listItemToplist');
        const elListToShift = elContainer.children[newRank - 1];
        const moveDir = newRank < oldRank ? 'before' : 'after';
        elListToShift[moveDir](elList);
        // From ICM source code
        unsafeWindow.$.iCheckMovies.reOrderTypeSerializedItems.itemListToplists =
            unsafeWindow.$('#itemListToplists').sortable('serialize');
        unsafeWindow.$.iCheckMovies.reOrder('itemListToplists');
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

        this.configWindow.load();
    }
}

const globalCfg = new GlobalCfg();

const useModules = [
    RandomFilmLink,
    HideTags,
    UpcomingAwardsList,
    CustomMovieColors,
    UpcomingAwardsOverview,
    ListCrossRef,
    NewTabs,
    LargePosters,
    ProgressPage,
    GroupMovieLists,
    ExportLists,
    ProgressTopX,
    QuickListReorder,
];

const app = new App(globalCfg);
useModules.forEach(m => app.register(m));
app.load();
console.log('ICM Enhanced is ready.');
