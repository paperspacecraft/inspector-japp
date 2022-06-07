// ==UserScript==
// @name         Inspector Japp - Prefiller addon
// @description  Embeds into Inspector Japp and allows prefilling in-page inputs
// @namespace    https://paperspacecraft.com/
// @version      0.1
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
        'main': '',
        'settings': '',
        'prefill': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36162 36162" width="22px" height="22px"><path fill="#FFFFFF" d="M19641 23284l-2029 1922c-214,320 -576,469 -955,469l-2373 0 0 2373c0,789 -635,1424 -1424,1424l-2373 0 0 2373c0,789 -635,1424 -1424,1424l-4746 0c-786,0 -1424,-635 -1424,-1424l0 -4746c0,-380 150,-742 417,-1009l9568 -9570c-320,-1003 -492,-2076 -492,-3186 0,-5767 4675,-10442 10442,-10442 5767,0 10442,4675 10442,10442 0,5767 -4675,10442 -10442,10442 -1110,0 -2183,-172 -3186,-492zm5559 -9949c1311,0 2373,-1062 2373,-2373 0,-1311 -1062,-2373 -2373,-2373 -1311,0 -2373,1062 -2373,2373 0,1311 1062,2373 2373,2373z"/></svg>'
    },

    styles: '',

    isServicePage: function() {},

    isPopup: function() {},

    createNode: function(tag, id, className) {},

    createStyles: function() {},

    createSettingsDialog: function(setting, title) {},

    getDialogWindowFeatures: function() {},

    createBasicToolbar: function() {},

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