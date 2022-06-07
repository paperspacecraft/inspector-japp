// ==UserScript==
// @name         Inspector Japp - Prefiller addon
// @description  Embeds into Inspector Japp and allows prefilling in-page inputs
// @namespace    https://paperspacecraft.com/
// @version      0.1.1
// @author       Stephen Velwetowl
// @icon         data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill-rule%3D%22evenodd%22%20viewBox%3D%220%200%203435%203303%22%20width%3D%2224px%22%20height%3D%2224px%22%3E%3Cpath%20fill%3D%22%23556B2F%22%20d%3D%22M705%20947c365%200%20651-22%201013-22s648%2022%201013%2022c-7-80-49-187-75-277-24-81-62-180-95-258C2454%20158%202393%200%202202%200c-208%200-374%20132-484%20132-136%200-218-132-550-132-150%200-344%20520-387%20670-26%2090-68%20198-75%20277zm88%201233c0-307-50-453%20298-604%20466-203%201551-110%201551%20318%200%20136%2022%20375-49%20458-68%2079-79%2021-135%2085-17%2019-182%20600-741%20600-226%200-449-120-579-299-178-246-90-271-215-335-50-26-130-39-130-222zm264-352c0%20401-21%20418%20374%20418%2034%200%2076-31%20100-54%2094-92%2015-145%2081-227%2051-63%20160-63%20210%200%2052%2065%2015%2036%2031%20124%2046%20251%20525%20196%20525%204%200-483%20141-374-1211-374-51%200-110%2059-110%20110zM0%201476c0%2074%2035%20124%2072%20170%20122%20152%20249%20266%20456%20314v330c-52%204-396%2077-396%20198%200%20192%20393%20381%20506%20551-25%20107-85%20157-110%20264h2378c-25-107-85-157-110-264%20138-205%20811-531%20350-681-75-24-159-61-240-68v-330c141-33%20235-100%20331-175%20132-105%20374-388-9-499-106-30-226-43-343-53-692-59-1624-68-2314-1-207%2020-570%2032-570%20244z%22%2F%3E%3C%2Fsvg%3E

// @match        http*://*/*

// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function(ns) {
    'use strict';

    const envSrc = `${location.protocol}//${location.host}${location.pathname}`;
    ns.prefills = GM_getValue('japp.prefills') && JSON.parse(GM_getValue('japp.prefills')) || {};

    if (window.self === window.top && !ns.isPopup()) {
        // Main flow
        setTimeout(() => {
            if (document.querySelector('#japp-toolbar') || ns.prefills[envSrc]) {
                ns.appendToToolbar();
            }
        }, 500);

    } else if (ns.isPopup()) {
        // Non-prefill popup window flow
        window.opener.postMessage({ event: 'japp-prefill', src: envSrc }, '*');
        return;
    }
    if (ns.prefills[envSrc]) {
        // Popup window flow
        const env = ns.prefills[envSrc];
        const prefill = env['prefill'];
        if (prefill) {
            Object.keys(prefill).forEach(key => {
                const input = document.querySelector(key);
                if (input) {
                    input.value = prefill[key];
                }
            });
        }
        if (env.click) {
            const clickable = document.querySelector(env.click);
            if (clickable) {
                clickable.click();
                if (window.opener) {
                    setTimeout(() => {
                        window.opener.postMessage({ event: 'japp-prefill', src: envSrc }, '*');
                    }, 2000);
                }
                return;
            }
        }
        if (window.opener) {
            window.opener.postMessage({ event: 'japp-prefill', src: envSrc }, '*');
        }

    }

})({

    icons: {
        'main': '<svg xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 3435 3303" width="24px" height="24px"><path fill="#e5e5e5" d="M705 947c365 0 651-22 1013-22s648 22 1013 22c-7-80-49-187-75-277-24-81-62-180-95-258C2454 158 2393 0 2202 0c-208 0-374 132-484 132-136 0-218-132-550-132-150 0-344 520-387 670-26 90-68 198-75 277zm88 1233c0-307-50-453 298-604 466-203 1551-110 1551 318 0 136 22 375-49 458-68 79-79 21-135 85-17 19-182 600-741 600-226 0-449-120-579-299-178-246-90-271-215-335-50-26-130-39-130-222zm264-352c0 401-21 418 374 418 34 0 76-31 100-54 94-92 15-145 81-227 51-63 160-63 210 0 52 65 15 36 31 124 46 251 525 196 525 4 0-483 141-374-1211-374-51 0-110 59-110 110zM0 1476c0 74 35 124 72 170 122 152 249 266 456 314v330c-52 4-396 77-396 198 0 192 393 381 506 551-25 107-85 157-110 264h2378c-25-107-85-157-110-264 138-205 811-531 350-681-75-24-159-61-240-68v-330c141-33 235-100 331-175 132-105 374-388-9-499-106-30-226-43-343-53-692-59-1624-68-2314-1-207 20-570 32-570 244z"/></svg>',
        'settings': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#FFF" d="M495.9 166.6C499.2 175.2 496.4 184.9 489.6 191.2L446.3 230.6C447.4 238.9 448 247.4 448 256C448 264.6 447.4 273.1 446.3 281.4L489.6 320.8C496.4 327.1 499.2 336.8 495.9 345.4C491.5 357.3 486.2 368.8 480.2 379.7L475.5 387.8C468.9 398.8 461.5 409.2 453.4 419.1C447.4 426.2 437.7 428.7 428.9 425.9L373.2 408.1C359.8 418.4 344.1 427 329.2 433.6L316.7 490.7C314.7 499.7 307.7 506.1 298.5 508.5C284.7 510.8 270.5 512 255.1 512C241.5 512 227.3 510.8 213.5 508.5C204.3 506.1 197.3 499.7 195.3 490.7L182.8 433.6C167 427 152.2 418.4 138.8 408.1L83.14 425.9C74.3 428.7 64.55 426.2 58.63 419.1C50.52 409.2 43.12 398.8 36.52 387.8L31.84 379.7C25.77 368.8 20.49 357.3 16.06 345.4C12.82 336.8 15.55 327.1 22.41 320.8L65.67 281.4C64.57 273.1 64 264.6 64 256C64 247.4 64.57 238.9 65.67 230.6L22.41 191.2C15.55 184.9 12.82 175.3 16.06 166.6C20.49 154.7 25.78 143.2 31.84 132.3L36.51 124.2C43.12 113.2 50.52 102.8 58.63 92.95C64.55 85.8 74.3 83.32 83.14 86.14L138.8 103.9C152.2 93.56 167 84.96 182.8 78.43L195.3 21.33C197.3 12.25 204.3 5.04 213.5 3.51C227.3 1.201 241.5 0 256 0C270.5 0 284.7 1.201 298.5 3.51C307.7 5.04 314.7 12.25 316.7 21.33L329.2 78.43C344.1 84.96 359.8 93.56 373.2 103.9L428.9 86.14C437.7 83.32 447.4 85.8 453.4 92.95C461.5 102.8 468.9 113.2 475.5 124.2L480.2 132.3C486.2 143.2 491.5 154.7 495.9 166.6V166.6zM256 336C300.2 336 336 300.2 336 255.1C336 211.8 300.2 175.1 256 175.1C211.8 175.1 176 211.8 176 255.1C176 300.2 211.8 336 256 336z"/></svg>',
        'prefill': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36162 36162" width="22px" height="22px"><path fill="#FFFFFF" d="M19641 23284l-2029 1922c-214,320 -576,469 -955,469l-2373 0 0 2373c0,789 -635,1424 -1424,1424l-2373 0 0 2373c0,789 -635,1424 -1424,1424l-4746 0c-786,0 -1424,-635 -1424,-1424l0 -4746c0,-380 150,-742 417,-1009l9568 -9570c-320,-1003 -492,-2076 -492,-3186 0,-5767 4675,-10442 10442,-10442 5767,0 10442,4675 10442,10442 0,5767 -4675,10442 -10442,10442 -1110,0 -2183,-172 -3186,-492zm5559 -9949c1311,0 2373,-1062 2373,-2373 0,-1311 -1062,-2373 -2373,-2373 -1311,0 -2373,1062 -2373,2373 0,1311 1062,2373 2373,2373z"/></svg>',
    },

    styles: `
        #japp-toolbar, #japp-tooltip, .japp-dropdown-content {
          z-index: 8999;
        }
        #japp-toolbar, #japp-tooltip, #japp-toolbar ul li {
          font-family: Tahoma, Verdana, sans-serif !important;
        }
        #japp-toolbar {
          position: fixed;
          display: flex;
          height: 34px;
          padding: 4px 6px;
          top: 0;
          left: 50%;
          transform: translate(-50%,0);
          background-color: #999;
          opacity: .5;
          border-radius: 0 0 4px 4px;
        }
        #japp-toolbar:hover {
          opacity: 1;
        }
        #japp-toolbar, #japp-toolbar a {
          font-size: 14px;
          font-family: Tahoma, Arial, sans-serif;
        }
        .japp-env-title {
          color: #999;
          background-color: #CCC;
          margin-right: 8px;
          padding: 2px 6px;
          border-radius: 3px;
          align-self: center;
        }
        .japp-env-title, #japp-toolbar a {
          line-height: 18px;
        }
        .japp-toolbar-button {
          width: 20px;
          height: 20px;
          align-self: center;
          margin: 0 8px 0 0;
          opacity: .75;
        }
        .japp-toolbar-button:hover {
          opacity: 1;
        }
        .japp-toolbar-button:first-child {
          width: 24px;
          height: 24px;
          margin: 0 10px 0 2px;
        }
        .japp-toolbar-button:last-child {
          margin-right: 4px;
        }
        .japp-toolbar-button>div {
          max-height: 22px;
        }
        #japp-crxde svg {
          transform: scale(1.05) translate(0, 1px);
        }
        #japp-editmode svg, #japp-disabledmode svg {
            transform: scale(1.1, 1.15) translate(0, 0.5px);
        }
        #japp-copy svg {
            transform: translate(0px, 3px);
        }
        #japp-delete svg {
            transform: scale(1, 0.85) translate(0, -2px);
        }
        #japp-enable.disabled {
          filter: grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8);
        }
        #japp-enable.enabled {
          filter: grayscale(100%) brightness(80%) sepia(300%) hue-rotate(50deg) saturate(500%);
        }

        #japp-tooltip {
          position: absolute;
          display: none;
          padding: 4px 8px;
          line-height: 12px;
          align-items: center;
          max-width: 600px;
          background-color: #666;
          opacity:.75;
          border-radius: 3px;
        }
        #japp-tooltip.visible {
          display: flex;
        }
        #japp-tooltip:hover {
          opacity: 1;
        }
        #japp-tooltip, #japp-tooltip a, #japp-tooltip a:visited {
          color: #fff;
          text-decoration: none;
        }
        .japp-tooltip-button {
          width: 22px;
          align-self: center;
          height: 22px;
          margin-right: 8px;
          opacity: .65;
        }
        .japp-tooltip-button:hover {
          opacity: 1;
        }
        #japp-tooltip-title {
          padding-right: 8px;
          max-width: 300px;
          color: #CCC;
          font-size: 13px;
          overflow-wrap: break-word;
        }
        
        .japp-separator {
          display: inline-block;
          align-self:center;
          width: 1px;
          height: 24px;
          margin-right: 9px;
          border-right: 1px Solid #FFF;
          opacity: .5;
        }
        .japp-separator-v {
          border-bottom: 1px Solid #FFF;
          margin: 4px 8px;
          opacity: .5;
        }
        
        .japp-dropdown {
          cursor: default;
        }
        .japp-dropdown:hover .japp-dropdown-content {
          display: block;
        }
        .japp-dropdown-content {
          display: none;
          position: absolute;
          padding: 0;
          margin-top: 0;
          margin-left: -6px;
          background-color: #7A7A7A;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        .japp-dropdown-content.labelled {
          margin-left: 20px;
          border-radius: 0 3px 3px 0;
        }
        .japp-dropdown-content.labelled:before {
          display: block;
          position: absolute;
          width: 26px;
          line-height: 26px;
          height: 100%;
          left: -25px;
          padding: 10px 0;
          box-sizing: border-box;
          color: #DDD;
          background-color: #888;
          content: attr(data-label);
          text-transform: uppercase;
          writing-mode: tb-rl;
          font-weight: bold;
          text-align: right;
          letter-spacing: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          transform: rotate(180deg);
          border-radius: 0px 3px 3px 0px;
        }
        .japp-dropdown-content li {
          list-style: none;
        }
        .japp-dropdown-content li a {
          display: block;
          padding: 6px 10px;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: pre;
          color: #CCC;
          text-decoration: none;
        }
        .japp-dropdown-content li a:hover {
          color: #666;
          background-color: #CCC;
        }
        .japp-dropdown-content li a .swatch {
          display: inline-block;
          width: 10px;
          height: 10px;
        }
        .japp-bold {
          font-weight: bold;
        }
        `,

    isServicePage: function() {
        return /\/crx\/|\/system\/console|\/siteadmin|\/useradmin|\/damadmin|\/miscadmin/.test(location.pathname);
    },

    isPopup: function() {
        return window.opener && window.opener !== window && /^japp-dialog/.test(window.name);
    },

    createNode: function(tag, id, className) {
        const result = document.createElement(tag);
        if (id) {
            result.id = id;
        }
        if (Array.isArray(className)) {
            result.classList.add(...className);
        } else if (className) {
            result.classList.add(className);
        }
        return result;
    },

    createStyles: function() {
        if (document.head.querySelector('style#japp-style')) {
            return;
        }
        const css = document.createElement('STYLE');
        css.id = 'japp-style';
        css.innerHTML = this.styles;
        document.head.appendChild(css);
    },

    createSettingsDialog: function(setting, title) {
        const popup = window.open('', 'japp-dialog:Settings', this.getDialogWindowFeatures());
        popup.document.write(`
                <html lang="en">
                    <head>
                        <title>${title}</title>
                        <style>
                            body {display: flex; flex-direction: column; margin: 0; height: 100%;}
                            .toolbar {display: flex; font-family: Tahoma,Arial,sans-serif; line-height: 60px; border-bottom: 1px Solid #aaa; background-color: #EEE;}
                            .toolbar span {flex-grow: 1; padding: 0 8px; font-size: 14px;}
                            .toolbar button {background: none; border: none; padding: 0 10px; cursor: pointer; font-size: 14px; font-weight: bold;}
                            .toolbar button:hover {background: #FAFAFA;}
                            textarea {width: 100%; flex-grow: 1; resize: none; border: none; outline: none; font-size: 14px;}
                        </style>
                    </head>
                    <body>
                        <div class="toolbar" style="">
                            <span style="">${title}</span>
                            <button id="cancel">&#10005;</button>
                            <button id="ok" style="font-size:18px;">&check;</button>
                        </div>
                        <textarea id="settings">${GM_getValue(setting) || ''}</textarea>
                    </body>
                </html>`);
        popup.document.close();
        popup.document.querySelector('#cancel').onclick = () => popup.close();
        popup.document.querySelector('#ok').onclick = () => {popup.window.result='ok'; popup.close();};
        popup.onbeforeunload = () => {
            const settingsJson = popup.document.getElementById('settings').value;
            if (popup.window.result !== 'ok') {
                return;
            }
            try {
                JSON.parse(settingsJson);
                GM_setValue(setting, settingsJson);
                window.location.reload();
                setTimeout(() => popup.close(), 10);
            } catch (e) {
                delete popup.window.result;
                popup.window.errorMessage = 'Not a valid JSON. Settings were not updated.';
            }
        };
        popup.onunload = () => {
            if (popup.window.result === 'ok') {
                window.location.reload();
            } else if (popup.window.errorMessage) {
                alert(popup.window.errorMessage);
            }
        }

    },

    getDialogWindowFeatures: function() {
        const width = 600;
        const height = 600;
        const position = {
            x: (screen.width / 2) - (width / 2),
            y: (screen.height/2) - (height / 2)
        };
        return `popup=yes,width=${width},height=${height},left=${position.x},top=${position.y}`;
    },

    createBasicToolbar: function() {
        let toolbar = document.querySelector('#japp-toolbar');
        if (toolbar) {
            return toolbar;
        }
        toolbar = document.createElement('DIV');
        toolbar.id = 'japp-toolbar';
        document.body.appendChild(toolbar);
        const icon = this.createNode('SPAN', null, 'japp-toolbar-button');
        icon.innerHTML = this.icons.main;
        icon.style.opacity = '1';
        toolbar.appendChild(icon);

        const settingsDropdown = this.createNode('DIV', 'japp-settings', ['japp-dropdown', 'japp-toolbar-button']);
        settingsDropdown.title = 'Settings';
        const settingsDropdownIcon = this.createNode('DIV');
        settingsDropdownIcon.innerHTML = this.icons.settings;
        settingsDropdown.appendChild(settingsDropdownIcon);
        const settingsDropdownContent = this.createNode('UL', 'japp-settings-dropdown', 'japp-dropdown-content');
        settingsDropdown.appendChild(settingsDropdownContent);
        toolbar.appendChild(settingsDropdown);

        return toolbar;
    },

    appendToToolbar: function() {
        this.createStyles();
        const toolbar = this.createBasicToolbar();
        const envGroup = toolbar.getAttribute('data-env-group') || undefined;

        const prefillsOption = this.createNode('LI');
        const prefillsButton = this.createNode('A', null, 'japp-bold');
        prefillsButton.innerHTML = '<span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;PREFILLS...';
        prefillsButton.href='javascript:void(0)';
        prefillsButton.onclick = () => this.createSettingsDialog('japp.prefills', 'Inspector Japp Prefills');
        prefillsOption.appendChild(prefillsButton);
        toolbar.querySelector('#japp-settings-dropdown').appendChild(prefillsOption);

        if (!Object.keys(this.prefills).length) {
            return;
        }

        const prefillDropdown = this.createNode('DIV', null, ['japp-dropdown', 'japp-toolbar-button']);
        prefillDropdown.title = 'Prefill';

        const prefillDropdownIcon = this.createNode('DIV');
        prefillDropdownIcon.innerHTML = this.icons.prefill;
        prefillDropdown.appendChild(prefillDropdownIcon);

        const prefillDropdownContent = this.createNode('UL', null, ['japp-dropdown-content', 'labelled']);
        prefillDropdownContent.style.marginTop = '0';
        prefillDropdownContent.setAttribute('data-label', 'Prefill');

        const optionEverywhere = this.createNode('LI');
        const optionEverywhereButton = this.createNode('A', null, 'japp-bold');
        optionEverywhereButton.href='javascript:void(0)';
        optionEverywhereButton.innerHTML = '<span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;EVERYWHERE';
        optionEverywhereButton.onclick = async () => {
            let popup;
            for (const envSrc of Object.keys(this.prefills)) {
                if (this.prefills[envSrc].manual === false) {
                    continue;
                }
                if (!popup) {
                    popup = window.open(envSrc, 'japp-dialog:Prefill', `popup=yes,width=200,height=200,top=50,left=${window.screen.width - 250}`);
                } else {
                    popup.location = envSrc;
                }
                await this.completePrefill(popup, new URL(envSrc).origin);
            }
            popup && popup.close();
        };
        optionEverywhere.appendChild(optionEverywhereButton);
        prefillDropdownContent.appendChild(optionEverywhere);

        const matchingAddress = this.getMatchingEnvironment();
        if (matchingAddress) {
            const optionHere = this.createNode('LI');
            const optionHereButton = this.createNode('A');
            optionHereButton.href='javascript:void(0)';
            const optionColor = this.getMatchingColor(toolbar, matchingAddress);
            optionHereButton.innerHTML = `<span class="swatch" style="background-color: ${optionColor};"></span>&nbsp;&nbsp;<span class="japp-bold">HERE</span>&nbsp;<small>${this.prefills[matchingAddress].title}</small>`;
            optionHereButton.onclick = async () => {
                await this.openAndStartPrefill(matchingAddress);
                window.location.reload();
            }
            optionHere.appendChild(optionHereButton);
            prefillDropdownContent.appendChild(optionHere);
        }


        let needSeparator = true;
        Object.keys(this.prefills).forEach(key => {
            if (this.prefills[key].manual === false || envGroup !== this.prefills[key].group) {
                return;
            }
            if (needSeparator || this.prefills[key].separator) {
                prefillDropdownContent.appendChild(this.createNode('LI', null, 'japp-separator-v'));
                needSeparator = false;
            }
            const option = this.createNode('LI');
            const optionButton = this.createNode('A');
            optionButton.href='javascript:void(0)';
            const optionOrigin = new URL(key).origin;
            const optionColor = this.getMatchingColor(toolbar, key);
            optionButton.innerHTML = `<span class="swatch" style="background-color: ${optionColor};"></span>&nbsp;&nbsp;<span class="japp-bold">${this.prefills[key].title}</span>&nbsp;&nbsp;<small>${optionOrigin}</small>`;
            optionButton.onclick = async () => this.openAndStartPrefill(key);
            option.appendChild(optionButton);
            prefillDropdownContent.appendChild(option);
        });

        prefillDropdown.appendChild(prefillDropdownContent);
        toolbar.insertBefore(prefillDropdown, toolbar.querySelector('#japp-settings'));
    },

    openAndStartPrefill: async function(location) {
        let popup = window.open(location, 'japp-dialog:Prefill', `popup=yes,width=300,height=300,top=50,left=${window.screen.width - 250}`);
        await this.completePrefill(popup, new URL(location).origin);
        popup.close();
    },

    completePrefill: async function(win, src) {
        const abortController = new AbortController();
        return new Promise(resolve => {
            const listener = event => {
                if (event.data && event.data.event === 'japp-prefill' && new URL(event.data.src).origin === src) {
                    abortController.abort();
                    resolve('complete');
                }
            };
            setTimeout(() => {
                abortController.abort();
                resolve('timeout');
            }, 15000);

            window.addEventListener('message', listener, { signal: abortController.signal });
        });
    },

    getMatchingEnvironment: function() {
        for (const key of Object.keys(this.prefills)) {
            const url = new URL(key);
            if (url.origin === location.origin) {
                return key;
            }
        }
        return null;
    },

    getMatchingColor: function(toolbar, src) {
        const optionOrigin = new URL(src).origin;
        let optionColor = toolbar.querySelector(`[data-origin="${optionOrigin}"]`);
        return optionColor && optionColor.dataset.color || '#CCC';
    }

});