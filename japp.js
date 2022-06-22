// ==UserScript==
// @name         Inspector Japp
// @description  Simplifies inspecting and navigating AEM pages
// @namespace    https://paperspacecraft.com/
// @version      0.1.4
// @author       Stephen Velwetowl
// @icon         data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill-rule%3D%22evenodd%22%20viewBox%3D%220%200%203435%203303%22%20width%3D%2224px%22%20height%3D%2224px%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M705%20947c365%200%20651-22%201013-22s648%2022%201013%2022c-7-80-49-187-75-277-24-81-62-180-95-258C2454%20158%202393%200%202202%200c-208%200-374%20132-484%20132-136%200-218-132-550-132-150%200-344%20520-387%20670-26%2090-68%20198-75%20277zm88%201233c0-307-50-453%20298-604%20466-203%201551-110%201551%20318%200%20136%2022%20375-49%20458-68%2079-79%2021-135%2085-17%2019-182%20600-741%20600-226%200-449-120-579-299-178-246-90-271-215-335-50-26-130-39-130-222zm264-352c0%20401-21%20418%20374%20418%2034%200%2076-31%20100-54%2094-92%2015-145%2081-227%2051-63%20160-63%20210%200%2052%2065%2015%2036%2031%20124%2046%20251%20525%20196%20525%204%200-483%20141-374-1211-374-51%200-110%2059-110%20110zM0%201476c0%2074%2035%20124%2072%20170%20122%20152%20249%20266%20456%20314v330c-52%204-396%2077-396%20198%200%20192%20393%20381%20506%20551-25%20107-85%20157-110%20264h2378c-25-107-85-157-110-264%20138-205%20811-531%20350-681-75-24-159-61-240-68v-330c141-33%20235-100%20331-175%20132-105%20374-388-9-499-106-30-226-43-343-53-692-59-1624-68-2314-1-207%2020-570%2032-570%20244z%22%2F%3E%3C%2Fsvg%3E

// @match        http*://*/*

// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function(ns) {
    'use strict';

    // Early return if the context is inappropriate
    if (((window.self !== window.top) && ns.isEditMode()) || ns.isPopup()) {
        return;
    }

    // Initialize URL mappings
    try {
        ns.urlMappings = GM_getValue('japp.mappings') ? JSON.parse(GM_getValue('japp.mappings')) : {};
        Object.keys(ns.urlMappings).filter(key => !key.startsWith('_')).forEach(key => ns.urlMappings[key].host = new URL(key).host);
    } catch (e) {
        ns.urlMappings = {};
    }
    const mappingsSpecified = Object.keys(ns.urlMappings).length > 0;
    ns.urlMappings._local = {
        title: 'LOCAL',
        color: '#73B5DD',
    }

    const toolbarRequested = location.search && new URLSearchParams(location.search).get('japp-toolbar');

    // Skip the following routines if there is mappings and the current location does not match them. Continue if the current
    // location does match the mapping, or else there are no mappings and we need a toolbar so that a user is able to edit settings
    if (mappingsSpecified
        && !ns.getMapping(location.origin)
        && !ns.isLocalhost(location.hostname)
        && !toolbarRequested) {
        return;
    }

    // Create UI
    document.body.dataset.jappTooltipsEnabled = GM_getValue('japp.tooltips.enabled') !== 'false';

    ns.createStyles();
    ns.createToolbar(mappingsSpecified);
    mappingsSpecified && ns.createFavicon();

    // Now exit without seeking and processing CQ elements if this site is unspecified (because there are no mappings)
    // or else we're in Edit mode, or else this is not a user-oriented html page
    if (!mappingsSpecified
        || ns.isEditMode()
        || (!window.location.pathname.endsWith('.html') && !window.location.pathname.includes('.html/'))) {
        return;
    }

    // If not in Edit mode, prepare the elements that can bear the tooltip, then prepare the tooltip itself
    const cqTags = document.querySelectorAll('cq[data-path]');
    if (!cqTags.length) {
        ns.loadPreviewVersion().then(componentElements => {
            for (const element of componentElements) {
                const analog = ns.findAnalog(element, componentElements);
                if (analog) {
                    analog.dataset.componentConfig = element.dataset.componentConfig;
                }
            }
        });
    } else {
        ns.prepareComponentElements(cqTags);
    }

    const tooltip = ns.createTooltip();
    document.body.onmouseover = function(e) {
        if (e.target === tooltip || tooltip.contains(e.target)) {
            e.stopPropagation();
            return;
        }
        const component = e.target.closest('[data-component-config]');

        if (component && tooltip.component !== component && document.body.dataset.jappTooltipsEnabled !== 'false') {
            const config = JSON.parse(component.dataset.componentConfig);

            const bounds = component.getBoundingClientRect();
            tooltip.classList.add('visible');
            tooltip.style.top = (bounds.y + window.scrollY + 2) + 'px';
            tooltip.style.left = (bounds.x + window.scrollX + 2) + 'px';

            const title = tooltip.querySelector('#japp-tooltip-title');
            title.innerHTML = (config.type || config.path || '').replace(/\//g, '&nbsp;/ ');

            const copyButton = tooltip.querySelector('#japp-copy');
            copyButton.dataset.path = ns.encodeURI(config.path);

            const linkButton = tooltip.querySelector('#japp-crxde');
            linkButton.href = `${ns.getManagementOrigin()}/crx/de/index.jsp#${ns.encodeURI(config.path).replace(/:/g, '%3A')}`;

            const addButton = tooltip.querySelector('#japp-add');
            addButton.dataset.parentPath = ns.encodeURI(config.path.split('/').slice(0, -1).join('/'));

            const editButton = tooltip.querySelector('#japp-edit');
            editButton.dataset.dialogSrc = ns.encodeURI(config.dialogSrc);
            editButton.dataset.resourceType = config.type;

            const deleteButton = tooltip.querySelector('#japp-delete');
            deleteButton.dataset.path = ns.encodeURI(config.path);

            tooltip.component = component;
        } else if (!component || !document.body.dataset.jappTooltipsEnabled === 'false') {
            tooltip.classList.remove('visible');
            tooltip.component = null;
        }
    }

})({

    /* ---------
       Constants
       --------- */

    icons: {
        'main': '<svg xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 3435 3303" width="24px" height="24px"><path fill="#e5e5e5" d="M705 947c365 0 651-22 1013-22s648 22 1013 22c-7-80-49-187-75-277-24-81-62-180-95-258C2454 158 2393 0 2202 0c-208 0-374 132-484 132-136 0-218-132-550-132-150 0-344 520-387 670-26 90-68 198-75 277zm88 1233c0-307-50-453 298-604 466-203 1551-110 1551 318 0 136 22 375-49 458-68 79-79 21-135 85-17 19-182 600-741 600-226 0-449-120-579-299-178-246-90-271-215-335-50-26-130-39-130-222zm264-352c0 401-21 418 374 418 34 0 76-31 100-54 94-92 15-145 81-227 51-63 160-63 210 0 52 65 15 36 31 124 46 251 525 196 525 4 0-483 141-374-1211-374-51 0-110 59-110 110zM0 1476c0 74 35 124 72 170 122 152 249 266 456 314v330c-52 4-396 77-396 198 0 192 393 381 506 551-25 107-85 157-110 264h2378c-25-107-85-157-110-264 138-205 811-531 350-681-75-24-159-61-240-68v-330c141-33 235-100 331-175 132-105 374-388-9-499-106-30-226-43-343-53-692-59-1624-68-2314-1-207 20-570 32-570 244z"/></svg>',
        'enable-tooltip': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37373 37373"><path fill-rule="nonzero" fill="#FFF" d="M33369 0H4005C1793 0 1 1793 1 4004v29364c0 2211 1793 4004 4004 4004h20480c1416 0 2774-563 3776-1564l7550-7550c1004-1004 1563-2356 1563-3774V4004c0-2212-1794-4004-4004-4004zM5339 5339h26695v18686h-5339c-1474 0-2670 1196-2670 2670v5339H5339V5339z"/></svg>',
        'crxde': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1611 1432"><path fill-rule="nonzero" fill="#FFF" d="M481 112L749 10c36-14 76-14 111 0l268 102c61 23 101 81 101 146v314c4 1 7 2 11 1l268 104c61 23 101 81 101 146v333c0 62-37 118-94 143l-268 118c-40 18-86 18-126 0l-317-139-317 139c-40 18-86 18-126 0L92 1299c-57-25-94-81-94-143V823c0-65 40-123 101-146l268-104c4 1 7 0 11-1V258c0-65 40-123 101-146h0zm332 24c-5-2-13-2-16 0l-219 83 225 87 230-87-219-83zm283 453V338l-231 88v249l231-87zM433 702c-5-2-13-2-16 0l-219 83 227 87 227-87-219-83zm53 572l231-101V905l-231 88v281zm473-489l227 87 227-87-219-83c-5-2-13-2-16 0l-219 83zm518 373V904l-231 88v281l217-95c8-4 13-12 13-20h0z"/></svg>',
        'tools': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1645 1645"><path fill-rule="nonzero" fill="#FFF" d="M1410 0c130 0 235 105 235 235v1175c0 130-105 235-235 235H235c-130 0-235-105-235-235V235C0 105 105 0 235 0h1175zm0 235H940v470h470V235zm0 705H940v470h470V940zM705 705V235H235v470h470zm-470 705h470V940H235v470z"/></svg>',
        'copy': '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 159318 123913"><path fill="#FFF" d="M2592 15110c-3456-3458-3456-9061 0-12519 3457-3455 9061-3455 12518 0l53098 53114c3458 3457 3458 9045 0 12502l-53098 53106c-3457 3457-9061 3457-12518 0-3456-3457-3456-9045 0-12502l46835-46855L2592 15109zm99745 9110h15154V9066c0-4868 3983-8851 8851-8851s8851 3983 8851 8851v15154h15154c4868 0 8851 3983 8851 8851s-3983 8851-8851 8851h-15154v15154c0 4868-3983 8851-8851 8851s-8851-3983-8851-8851V41922h-15154c-4868 0-8851-3983-8851-8851s3983-8851 8851-8851zm48130 81992c4896 0 8851 3955 8851 8851s-3955 8851-8851 8851H70808c-4896 0-8851-3955-8851-8851s3955-8851 8851-8851h79659z"/></svg>',
        'add': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9526 9583"><path fill="#FFF" d="M3621 1118c334 0 604 287 604 603 0 351-270 604-604 604H1811c-333 0-604 287-604 604v4845c0 334 270 604 604 604h4828c334 0 603-270 603-604V5947c0-317 270-603 604-603s604 287 604 603v1827c0 1000-811 1810-1810 1810H1812C812 9584 2 8773 2 7774V2929c0-1000 811-1810 1810-1810h1810zM7416 0c332 0 604 272 604 604v904h904c332 0 604 272 604 603 0 332-272 604-604 604h-904v904c0 332-272 604-604 604s-603-272-603-604v-904h-904c-332 0-603-272-603-604s272-603 603-603h904V604c0-332 272-604 603-604z"/></svg>',
        'edit': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#FFF" d="M490.3 40.4C512.2 62.27 512.2 97.73 490.3 119.6L460.3 149.7L362.3 51.72L392.4 21.66C414.3-.2135 449.7-.2135 471.6 21.66L490.3 40.4zM172.4 241.7L339.7 74.34L437.7 172.3L270.3 339.6C264.2 345.8 256.7 350.4 248.4 353.2L159.6 382.8C150.1 385.6 141.5 383.4 135 376.1C128.6 370.5 126.4 361 129.2 352.4L158.8 263.6C161.6 255.3 166.2 247.8 172.4 241.7V241.7zM192 63.1C209.7 63.1 224 78.33 224 95.1C224 113.7 209.7 127.1 192 127.1H96C78.33 127.1 64 142.3 64 159.1V416C64 433.7 78.33 448 96 448H352C369.7 448 384 433.7 384 416V319.1C384 302.3 398.3 287.1 416 287.1C433.7 287.1 448 302.3 448 319.1V416C448 469 405 512 352 512H96C42.98 512 0 469 0 416V159.1C0 106.1 42.98 63.1 96 63.1H192z"/></svg>',
        'noedit': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24856 22170"><path fill="#FFF" d="M23039 1538c958 957 958 2508 0 3465l-1313 1317-4287-4287 1317-1315c958-957 2507-957 3465 0l818 820zM1930 954C1487 605 901 63 287 699c-584 605-176 1176 326 1571l22274 17445c1777 1429 2582-332 1437-1229l-3135-2457v-2299c0-735-626-1400-1400-1400s-1400 665-1400 1400v103l-2342-1837 4691-4688-4288-4286-5207 5209-3708-2901h2453c774 0 1400-586 1400-1400 0-734-626-1400-1400-1400H5788c-525 0-1027 96-1490 272L1929 953zm11565 13593l-81 81c-267 271-595 472-958 595l-3885 1295c-416 123-792 26-1076-293-280-245-376-661-254-1037l1295-3885c54-160 123-313 207-457l4752 3701zM4389 7465v10505c0 774 627 1400 1400 1400h11200c640 0 1179-428 1346-1014l2246 1790c-737 1213-2070 2023-3592 2023H5789c-2320 0-4200-1881-4200-4200V6730c0-449 71-882 202-1288l2599 2022z"/></svg>',
        'delete': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="#FFF" d="M160 400C160 408.8 152.8 416 144 416C135.2 416 128 408.8 128 400V192C128 183.2 135.2 176 144 176C152.8 176 160 183.2 160 192V400zM240 400C240 408.8 232.8 416 224 416C215.2 416 208 408.8 208 400V192C208 183.2 215.2 176 224 176C232.8 176 240 183.2 240 192V400zM320 400C320 408.8 312.8 416 304 416C295.2 416 288 408.8 288 400V192C288 183.2 295.2 176 304 176C312.8 176 320 183.2 320 192V400zM317.5 24.94L354.2 80H424C437.3 80 448 90.75 448 104C448 117.3 437.3 128 424 128H416V432C416 476.2 380.2 512 336 512H112C67.82 512 32 476.2 32 432V128H24C10.75 128 0 117.3 0 104C0 90.75 10.75 80 24 80H93.82L130.5 24.94C140.9 9.357 158.4 0 177.1 0H270.9C289.6 0 307.1 9.358 317.5 24.94H317.5zM151.5 80H296.5L277.5 51.56C276 49.34 273.5 48 270.9 48H177.1C174.5 48 171.1 49.34 170.5 51.56L151.5 80zM80 432C80 449.7 94.33 464 112 464H336C353.7 464 368 449.7 368 432V128H80V432z"/></svg>',
        'settings': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#FFF" d="M495.9 166.6C499.2 175.2 496.4 184.9 489.6 191.2L446.3 230.6C447.4 238.9 448 247.4 448 256C448 264.6 447.4 273.1 446.3 281.4L489.6 320.8C496.4 327.1 499.2 336.8 495.9 345.4C491.5 357.3 486.2 368.8 480.2 379.7L475.5 387.8C468.9 398.8 461.5 409.2 453.4 419.1C447.4 426.2 437.7 428.7 428.9 425.9L373.2 408.1C359.8 418.4 344.1 427 329.2 433.6L316.7 490.7C314.7 499.7 307.7 506.1 298.5 508.5C284.7 510.8 270.5 512 255.1 512C241.5 512 227.3 510.8 213.5 508.5C204.3 506.1 197.3 499.7 195.3 490.7L182.8 433.6C167 427 152.2 418.4 138.8 408.1L83.14 425.9C74.3 428.7 64.55 426.2 58.63 419.1C50.52 409.2 43.12 398.8 36.52 387.8L31.84 379.7C25.77 368.8 20.49 357.3 16.06 345.4C12.82 336.8 15.55 327.1 22.41 320.8L65.67 281.4C64.57 273.1 64 264.6 64 256C64 247.4 64.57 238.9 65.67 230.6L22.41 191.2C15.55 184.9 12.82 175.3 16.06 166.6C20.49 154.7 25.78 143.2 31.84 132.3L36.51 124.2C43.12 113.2 50.52 102.8 58.63 92.95C64.55 85.8 74.3 83.32 83.14 86.14L138.8 103.9C152.2 93.56 167 84.96 182.8 78.43L195.3 21.33C197.3 12.25 204.3 5.04 213.5 3.51C227.3 1.201 241.5 0 256 0C270.5 0 284.7 1.201 298.5 3.51C307.7 5.04 314.7 12.25 316.7 21.33L329.2 78.43C344.1 84.96 359.8 93.56 373.2 103.9L428.9 86.14C437.7 83.32 447.4 85.8 453.4 92.95C461.5 102.8 468.9 113.2 475.5 124.2L480.2 132.3C486.2 143.2 491.5 154.7 495.9 166.6V166.6zM256 336C300.2 336 336 300.2 336 255.1C336 211.8 300.2 175.1 256 175.1C211.8 175.1 176 211.8 176 255.1C176 300.2 211.8 336 256 336z"/></svg>',
        'favicon-service': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#111" d="M507.6 122.8c-2.904-12.09-18.25-16.13-27.04-7.338l-76.55 76.56l-83.1-.0002l0-83.1l76.55-76.56c8.791-8.789 4.75-24.14-7.336-27.04c-23.69-5.693-49.34-6.111-75.92 .2484c-61.45 14.7-109.4 66.9-119.2 129.3C189.8 160.8 192.3 186.7 200.1 210.1l-178.1 178.1c-28.12 28.12-28.12 73.69 0 101.8C35.16 504.1 53.56 512 71.1 512s36.84-7.031 50.91-21.09l178.1-178.1c23.46 7.736 49.31 10.24 76.17 6.004c62.41-9.84 114.6-57.8 129.3-119.2C513.7 172.1 513.3 146.5 507.6 122.8zM80 456c-13.25 0-24-10.75-24-24c0-13.26 10.75-24 24-24s24 10.74 24 24C104 445.3 93.25 456 80 456z"/></svg>',
        'favicon-log': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#111" d="M464 480H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h416c26.51 0 48 21.49 48 48v352c0 26.51-21.49 48-48 48zM128 120c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm0 96c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm0 96c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm288-136v-32c0-6.627-5.373-12-12-12H204c-6.627 0-12 5.373-12 12v32c0 6.627 5.373 12 12 12h200c6.627 0 12-5.373 12-12zm0 96v-32c0-6.627-5.373-12-12-12H204c-6.627 0-12 5.373-12 12v32c0 6.627 5.373 12 12 12h200c6.627 0 12-5.373 12-12zm0 96v-32c0-6.627-5.373-12-12-12H204c-6.627 0-12 5.373-12 12v32c0 6.627 5.373 12 12 12h200c6.627 0 12-5.373 12-12z"/></svg>',
        'favicon-globe': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#111" d="M352 256C352 278.2 350.8 299.6 348.7 320H163.3C161.2 299.6 159.1 278.2 159.1 256C159.1 233.8 161.2 212.4 163.3 192H348.7C350.8 212.4 352 233.8 352 256zM503.9 192C509.2 212.5 512 233.9 512 256C512 278.1 509.2 299.5 503.9 320H380.8C382.9 299.4 384 277.1 384 256C384 234 382.9 212.6 380.8 192H503.9zM493.4 160H376.7C366.7 96.14 346.9 42.62 321.4 8.442C399.8 29.09 463.4 85.94 493.4 160zM344.3 160H167.7C173.8 123.6 183.2 91.38 194.7 65.35C205.2 41.74 216.9 24.61 228.2 13.81C239.4 3.178 248.7 0 256 0C263.3 0 272.6 3.178 283.8 13.81C295.1 24.61 306.8 41.74 317.3 65.35C328.8 91.38 338.2 123.6 344.3 160H344.3zM18.61 160C48.59 85.94 112.2 29.09 190.6 8.442C165.1 42.62 145.3 96.14 135.3 160H18.61zM131.2 192C129.1 212.6 127.1 234 127.1 256C127.1 277.1 129.1 299.4 131.2 320H8.065C2.8 299.5 0 278.1 0 256C0 233.9 2.8 212.5 8.065 192H131.2zM194.7 446.6C183.2 420.6 173.8 388.4 167.7 352H344.3C338.2 388.4 328.8 420.6 317.3 446.6C306.8 470.3 295.1 487.4 283.8 498.2C272.6 508.8 263.3 512 255.1 512C248.7 512 239.4 508.8 228.2 498.2C216.9 487.4 205.2 470.3 194.7 446.6H194.7zM190.6 503.6C112.2 482.9 48.59 426.1 18.61 352H135.3C145.3 415.9 165.1 469.4 190.6 503.6V503.6zM321.4 503.6C346.9 469.4 366.7 415.9 376.7 352H493.4C463.4 426.1 399.8 482.9 321.4 503.6V503.6z"/></svg>',
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
        .drag-handle {
          cursor: move;
        }
        `,

    /* -----------
       Basic utils
       ----------- */

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

    /* -------------
       Basic styling
       ------------- */

    createStyles: function() {
        if (document.head.querySelector('style#japp-style')) {
            return;
        }
        const css = document.createElement('STYLE');
        css.id = 'japp-style';
        css.innerHTML = this.styles;
        document.head.appendChild(css);
    },

    createFavicon: function() {
        const isLocal = this.getEnvTitle() === this.urlMappings._local.title;
        const isCrx = /\/crx\//i.test(location.pathname);
        const color = isLocal ? this.urlMappings._local.color : this.getMapping(location.origin) && this.getMapping(location.origin).color;
        if (!color || isCrx) {
            return;
        }
        const isServicePage = /\/system\/console\//i.test(location.pathname);
        const isLogPage = isServicePage && /slinglog\/tailer/i.test(location.pathname);
        let faviconContent;

        if (isLogPage) {
            faviconContent = this.icons['favicon-log'];
        } else if (isServicePage) {
            faviconContent = this.icons['favicon-service'];
        } else {
            let customFavicon = this.getMapping(location.origin) && this.getMapping(location.origin).icon;
            if (customFavicon && !/^<svg/i.test(customFavicon)) {
                customFavicon = (this.urlMappings._settings && this.urlMappings._settings.icons && this.urlMappings._settings.icons[customFavicon]) || this.icons[customFavicon];
            }
            faviconContent = customFavicon || this.icons['favicon-globe'];
        }

        const oldFavicon = document.querySelector('link[rel="icon"]');
        let newFavicon;
        if (oldFavicon) {
            newFavicon = oldFavicon.cloneNode(false);
        } else {
            newFavicon = this.createNode('LINK');
            newFavicon.rel = 'icon';
        }
        newFavicon.type = 'image/svg+xml';
        newFavicon.href = 'data:image/svg+xml;utf8,' + faviconContent.replace(/(?:#|%23)\d+/g, color.replace('#', '%23'));

        document.querySelectorAll('[rel~="icon"]').forEach(element => element.parentNode.removeChild(element));
        document.head.appendChild(newFavicon);
    },

    /* --------------
       Identification
       -------------- */

    isLocalhost: function(hostname) {
        return /^(local\.|localhost|127\.0\.0\.1)/i.test(hostname || location.hostname)
    },

    isEditMode: function() {
        try {
            return /\/editor.html\/|wcmmode=edit/i.test(window.top.location.href);
        } catch (e) {
            // Can catch a CORS exception here
            return false;
        }
    },

    isServicePage: function() {
        return /\/crx\/|\/system\/console|\/siteadmin|\/useradmin|\/damadmin|\/miscadmin/.test(location.pathname);
    },

    isPopup: function() {
        return window.opener
            && window.opener !== window
            && (/^japp-dialog/.test(window.name) || location.href.includes('crxbflow'));
    },

    getEnvTitle: function() {
        const url = new URL(window.location.href);
        if (this.isLocalhost(url.hostname)) {
            return this.urlMappings._local.title;
        }
        const mapping = this.getMapping(url.origin);
        if (mapping && mapping.title) {
            return mapping.title;
        }
        return '';
    },

    getEnvGroup: function() {
        const url = new URL(window.location.href);
        const mapping = this.getMapping(url.origin);
        return mapping && mapping.group || undefined;
    },

    /* -----------------
       Path manipulation
       ----------------- */

    getMapping: function(value) {
        if (this.urlMappings[value]) {
            return this.urlMappings[value];
        }
        const host = new URL(value).host;
        for(const mapping of Object.values(this.urlMappings)) {
            if (mapping.host === host) {
                return mapping;
            }
        }
        return undefined;
    },

    getPathWithoutEditorPrefix: function(src) {
        return src && src.replace(/\/editor\.html/i, '');
    },

    getManagementOrigin: function(usePath) {
        const url = new URL(window.location.href);
        const mapping = this.getMapping(url.origin);
        if (mapping) {
            let result = mapping.mgmtOrigin || url.origin;
            const managementOriginMapping = this.getMapping(result);
            if (managementOriginMapping
                && managementOriginMapping.pathTransform
                && managementOriginMapping.pathTransform.function
                && usePath) {
                const newUrl = new URL(result);
                const funcName = managementOriginMapping.pathTransform.function;
                result = newUrl.origin
                    + this[funcName](
                        this.getPathWithoutEditorPrefix(window.location.pathname),
                        managementOriginMapping.pathTransform);
            }
            return result;
        }
        if (this.isLocalhost(url.hostname)
            || (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) && !this.getMapping(url.origin))) {
            return url.origin;
        }
        return '';
    },

    getMappedUrl: function(value, options) {
        const src = (value || window.location.href).toString();
        let srcUrl = new URL(src);

        const useMgmtOrigin = options && options.useMgmtOrigin;
        const targetPath = (options && options.src && options.src.pathname) || srcUrl.pathname;
        const targetSearch = (options && options.src && options.src.search) || srcUrl.search;
        const targetHash = (options && options.src && options.src.hash) || srcUrl.hash;
        let targetOrigin;

        const additionalUrlTransform = options && options.urlTransform;
        const suppressBuiltInUrlTransform = options && options.suppressBuiltInUrlTransform;

        let mapping = this.getMapping(srcUrl.origin);
        if (useMgmtOrigin && mapping && mapping.mgmtOrigin) {
            targetOrigin = mapping.mgmtOrigin;
            mapping = this.getMapping(targetOrigin);
        }

        if (!mapping && (!src || this.isLocalhost(srcUrl.hostname) || (/^\d+\.\d+\.\d+\.\d+$/.test(srcUrl.hostname)))) {
            return srcUrl;
        }

        let newUrl = targetOrigin ? new URL(src.replace(srcUrl.origin, targetOrigin)) : new URL(src);
        const shouldTransformPath = !this.isServicePage();
        if (shouldTransformPath
            && mapping
            && mapping.pathTransform
            && mapping.pathTransform['function']) {

            newUrl.pathname = this[mapping.pathTransform['function']](targetPath, mapping.pathTransform);
        } else {
            newUrl.pathname = targetPath;
        }
        newUrl.search = targetSearch;
        newUrl.hash = targetHash;
        if (additionalUrlTransform) {
            newUrl = additionalUrlTransform(newUrl);
        }
        if (mapping
            && mapping.urlTransform
            && mapping.urlTransform['function']
            && !suppressBuiltInUrlTransform) {

            newUrl = this[mapping.urlTransform['function']](newUrl, mapping.urlTransform);
        }
        return newUrl;
    },

    convertPathToParameter: function(value, options) {
        const sourceUrl = value.origin ? value : new URL(value);
        const newUrl = new URL(sourceUrl.origin);
        const effectiveOptions = options || {
            basePath: '/libs/granite/core/content/login.html',
            paramName: 'resource'
        };
        newUrl.pathname = effectiveOptions['basePath'];
        newUrl.search = sourceUrl.search;
        newUrl.searchParams.set(effectiveOptions['paramName'], encodeURI(sourceUrl.pathname + sourceUrl.search).replace(/%25/g, '%'));
        newUrl.hash = sourceUrl.hash;
        return newUrl;
    },

    prependPathIfNeeded: function(value, options) {
        const cleanPath = this.getPathWithoutEditorPrefix(value);
        return (!cleanPath
            || cleanPath === '/'
            || cleanPath.startsWith(options['basePath'])
            || /^\/(apps|libs|etc|var|aem|content|crx|system)/i.test(cleanPath)
            || /\/base\/blueprint\//i.test(cleanPath))
            ? cleanPath
            : options['basePath'].replace(/\/$/, '') + '/' + cleanPath.replace(/^\//, '');
    },

    encodeURI(value) {
        return encodeURI(value).replace(/%25/g, '%').replace(/:/g, '%3A');
    },

    /* -----------
       UI creation
       ----------- */

    createBasicToolbar: function() {
        function applyDrag(element) {
            let currentPosition = 0;
            let prevPosition = 0;
            element.querySelector('.drag-handle').onmousedown = function(e) {
                e.preventDefault();
                prevPosition = e.clientX;
                document.onmouseup = finishDrag;
                document.onmousemove = doDrag;
            }
            function doDrag(e) {
                e.preventDefault();
                currentPosition = prevPosition - e.clientX;
                prevPosition = e.clientX;
                element.style.left = (element.offsetLeft - currentPosition) + "px";
            }
            function finishDrag() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }

        let toolbar = document.querySelector('#japp-toolbar');
        if (toolbar) {
            return toolbar;
        }
        toolbar = document.createElement('DIV');
        toolbar.id = 'japp-toolbar';
        document.body.appendChild(toolbar);
        const icon = this.createNode('SPAN', null, ['japp-toolbar-button', 'drag-handle']);
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

        applyDrag(toolbar);
        return toolbar;
    },

    createToolbar: function(mappingsInitialized) {
        const toolbar = this.createBasicToolbar();
        const envGroup = this.getEnvGroup();
        envGroup && toolbar.setAttribute('data-env-group', envGroup);

        const settingsDropdown = toolbar.querySelector('#japp-settings');

        const envTitle = mappingsInitialized && this.getEnvTitle();
        if (envTitle) {
            const titleDropdown = this.createNode('DIV', null, ['japp-env-title', 'japp-dropdown']);
            let options = '';
            for (const key of Object.keys(this.urlMappings)) {
                if (key.startsWith('_') || this.urlMappings[key].hidden || this.urlMappings[key].group !== envGroup) {
                    continue;
                }
                const optionTitle = this.urlMappings[key].title
                    ? `<span class="japp-bold">${this.urlMappings[key].title}</span>&nbsp;&nbsp;<small>${key}</small>`
                    : `<b>${this.urlMappings[key].title}</b>`;
                const optionColor = this.urlMappings[key].color || '#CCC';
                const option = `<li><a href="${this.getMappedUrl(key, {src: window.location}).toString()}"><span class="swatch" data-origin="${key}" data-color="${optionColor}" style="background-color: ${optionColor}"></span>&nbsp;&nbsp;${optionTitle}</a></li>`;
                const separator = this.urlMappings[key]['separator'] ? '<li class="japp-separator-v"></li>' : '';
                options += separator + option;
            }
            titleDropdown.innerHTML = `<span class='japp-bold'>${this.getEnvTitle()}</span><ul class="japp-dropdown-content labelled" data-label="Environments">${options}</ul>`;
            toolbar.insertBefore(titleDropdown, settingsDropdown);
        }

        const hasValidMapping = mappingsInitialized && this.getManagementOrigin();

        if (hasValidMapping) {

            if (!/\/crx\/de/i.test(location.pathname)) {
                const crxButton = this.createNode('A', 'japp-crxde', 'japp-tooltip-button');
                crxButton.title = 'Open in CRX/DE';
                crxButton.innerHTML = this.icons.crxde;
                const crxDeUrl = this.getMappedUrl('', {
                    useMgmtOrigin: true,
                    urlTransform: url => {
                        if (/^\/(?:content|etc|var|home)/i.test(url.pathname)) {
                            url.hash = url.pathname.replace(/\.html$/i, '');
                            url.pathname = '/crx/de/';
                        } else {
                            url.pathname = '/crx/de';
                        }
                        url.search = '';
                        return url;
                    }
                });
                crxButton.href = crxDeUrl.toString();
                toolbar.insertBefore(crxButton, settingsDropdown);
            }

            const toolsDropdown = this.createNode('DIV', 'japp-tools', ['japp-dropdown', 'japp-toolbar-button']);
            toolsDropdown.title = 'Tools';
            const toolsDropdownIcon = this.createNode('DIV');
            toolsDropdownIcon.innerHTML = this.icons.tools;
            toolsDropdown.appendChild(toolsDropdownIcon);
            const toolsDropdownContent = this.createNode('UL', null, ['japp-dropdown-content', 'labelled', 'japp-bold']);
            toolsDropdownContent.setAttribute('data-label', 'Tools');
            toolsDropdownContent.innerHTML = `
                <li><a href="${this.convertPathToParameter(this.getManagementOrigin() + '/crx/packmgr')}"><span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;PACKAGES</a></li>
                <li><a href="${this.convertPathToParameter(this.getManagementOrigin() + '/system/console/bundles')}"><span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;BUNDLES</a></li>
                <li><a href="${this.convertPathToParameter(this.getManagementOrigin() + '/system/console/configMgr')}"><span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;CONFIG</a></li>
                <li><a href="${this.convertPathToParameter(this.getManagementOrigin() + '/system/console/slinglog/tailer.txt?tail=100&name=%2Flogs%2Ferror.log')}"><span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;ERROR LOG</a></li>
            `;
            toolsDropdown.appendChild(toolsDropdownContent);
            toolbar.insertBefore(toolsDropdown, settingsDropdown);
        }

        if (!this.isServicePage() && !this.isEditMode() && hasValidMapping) {
            const editModeButton = this.createNode('A', 'japp-editmode', 'japp-toolbar-button');
            editModeButton.title = "Switch to Edit mode";
            editModeButton.innerHTML = this.icons.edit;
            editModeButton.style.height = '24px';
            const editModeUrl = this.getMappedUrl('', {
                useMgmtOrigin: true,
                urlTransform: url => {
                    url.pathname ='/editor.html' + url.pathname;
                    url.searchParams.set('wcmmode', 'edit');
                    return url;
                }
            });
            editModeUrl.searchParams.set('wcmmode', 'edit');
            editModeButton.href = editModeUrl.href;
            toolbar.insertBefore(editModeButton, settingsDropdown);

            const enableTooltipButton = this.createNode(
                'A', 
                'japp-enable',
                ['japp-toolbar-button', GM_getValue('japp.tooltips.enabled') === 'false' ? 'disabled' : 'enabled']);
            enableTooltipButton.title = "Enable or disable tooltips";
            enableTooltipButton.innerHTML = this.icons['enable-tooltip'];
            enableTooltipButton.href='javascript:void(0)';
            enableTooltipButton.onclick = () => {
                if (GM_getValue('japp.tooltips.enabled') === 'true') {
                    enableTooltipButton.classList.remove('enabled');
                    enableTooltipButton.classList.add('disabled');
                    GM_setValue('japp.tooltips.enabled', 'false');
                    document.body.dataset.jappTooltipsEnabled = 'false';
                } else {
                    enableTooltipButton.classList.remove('disabled');
                    enableTooltipButton.classList.add('enabled');
                    GM_setValue('japp.tooltips.enabled', 'true');
                    document.body.dataset.jappTooltipsEnabled = 'true';
                }
            };
            toolbar.insertBefore(enableTooltipButton, settingsDropdown);

        }

        if (this.isEditMode() && hasValidMapping) {
            const disabledModeButton = this.createNode('A', 'japp-disabledmode', 'japp-toolbar-button');
            disabledModeButton.title = 'Switch to wcmmode=disabled';
            disabledModeButton.innerHTML = this.icons.noedit;
            const disabledModeUrl = new URL(window.location.href);
            disabledModeUrl.pathname = disabledModeUrl.pathname.replace(/^\/editor.html\//i, '');
            disabledModeUrl.searchParams.set('wcmmode', 'disabled');
            disabledModeButton.href = disabledModeUrl.href;
            toolbar.insertBefore(disabledModeButton, settingsDropdown);
        }

        const settingsOption = this.createNode('LI');
        const settingsButton = this.createNode('A', null, 'japp-bold');
        settingsButton.innerHTML = '<span class="swatch" style="background-color: #DDD;"></span>&nbsp;&nbsp;ENVIRONMENTS...';
        settingsButton.href='javascript:void(0)';
        settingsButton.onclick = () => this.createSettingsDialog('japp.mappings', 'Inspector Japp Environments');
        settingsOption.appendChild(settingsButton);
        toolbar.querySelector('#japp-settings-dropdown').appendChild(settingsOption);
    },

    createTooltip: function() {
        const tooltip = document.createElement('DIV');
        tooltip.id = 'japp-tooltip';

        const crxButton = this.createNode('A', 'japp-crxde', 'japp-tooltip-button');
        crxButton.title = 'Open in CRX/DE';
        crxButton.innerHTML = this.icons.crxde;
        tooltip.appendChild(crxButton);

        tooltip.appendChild(this.createNode('SPAN', null, 'japp-separator'));

        const copyButton = this.createNode('A', 'japp-copy', 'japp-tooltip-button');
        copyButton.title = 'Copy path';
        copyButton.href='javascript:void(0)';
        copyButton.innerHTML = this.icons.copy;
        copyButton.onclick = () => {
            const path = new URL(this.getManagementOrigin(true).replace(/\/$/, '') + '/' + copyButton.dataset.path.replace(/^\//, '')).pathname;
            GM_setClipboard(path, 'text');
            alert(`Path\n\n${path}\n\ncopied to the clipboard`);
        };
        tooltip.appendChild(copyButton);

        const isisForeignMgmtOriginManagementOrigin = this.getMapping(location.origin) && this.getMapping(location.origin).isForeignMgmtOrigin;
        if (!isisForeignMgmtOriginManagementOrigin) {
            tooltip.appendChild(this.createNode('SPAN', null, 'japp-separator'));

            const addButton = this.createNode('A', 'japp-add', 'japp-tooltip-button');
            addButton.title = 'Add component';
            addButton.href = 'javascript:void(0)';
            addButton.innerHTML = this.icons.add;
            addButton.onclick = () => {
                let resType = prompt(`Specify the resource type of a component to create under\n\n${addButton.dataset.parentPath}\n`);
                if (!resType) {
                    return;
                }
                resType = resType.replace(/^\/apps/i, '').replace(/^\/+|\/+$/g, '');
                GM_xmlhttpRequest({
                    method: "POST",
                    url: this.getManagementOrigin() + addButton.dataset.parentPath + '/',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Referer': this.getManagementOrigin() + '/editor.html' + addButton.dataset.parentPath
                    },
                    data: '.%2Fsling%3AresourceType=' + encodeURIComponent(resType) + '&%3Aorder=last&%3AnameHint=newComponent',
                    onload: resp => {
                        if (resp.status !== 201) {
                            alert(resp.statusText || resp);
                        } else {
                            const parsingContainer = document.createElement('DIV');
                            parsingContainer.innerHTML = resp.responseText;
                            const createdElementAddr = parsingContainer.querySelector('title').innerText.split(' ').splice(-1)[0];
                            const dialogAddr = `/mnt/override/apps/${resType}/_cq_dialog.html${createdElementAddr}?page=true`;
                            const popup = window.open(dialogAddr, 'japp-dialog:Edit', 'popup');
                            popup.onbeforeunload = () => {
                                window.location.reload();
                                setTimeout(() => popup.close(), 50);
                            };
                        }
                    },
                    onerror: err => alert(err.statusText || err.message || err)
                });
            };
            tooltip.appendChild(addButton);

            const editButton = this.createNode('A', 'japp-edit', 'japp-tooltip-button');
            editButton.title = 'Edit component';
            editButton.href = 'javascript:void(0)';
            editButton.innerHTML = this.icons.edit;
            editButton.onclick = () => {
                const popup = window.open(
                    editButton.dataset.dialogSrc
                        + (editButton.dataset.dialogSrc.includes('?') ? '&' : '?')
                        + 'page=true'
                        + (editButton.dataset.resourceType ? '&resourceType=' + editButton.dataset.resourceType : ''),
                    'japp-dialog:Edit',
                    this.getDialogWindowFeatures());
                popup.onbeforeunload = () => {
                    window.location.reload();
                    setTimeout(() => popup.close(), 10);
                }
            };
            tooltip.appendChild(editButton);

            const deleteButton = this.createNode('A', 'japp-delete', 'japp-tooltip-button');
            deleteButton.title = 'Delete component';
            deleteButton.href = 'javascript:void(0)';
            deleteButton.innerHTML = this.icons.delete;
            deleteButton.onclick = () => {
                if (!confirm(`Delete component at this path?\n\n${deleteButton.dataset.path}`)) {
                    return;
                }
                GM_xmlhttpRequest({
                    method: "POST",
                    url: this.getManagementOrigin() + deleteButton.dataset.path,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Referer': this.getManagementOrigin() + '/editor.html' + deleteButton.dataset.path
                    },
                    data: '%3Aoperation=delete',
                    onload: resp => {
                        if (resp.status !== 200) {
                            alert(resp.statusText || resp);
                        } else {
                            window.location.reload();
                        }
                    },
                    onerror: err => alert(err.statusText || err.message || err)
                });
            };
            tooltip.appendChild(deleteButton);
        }

        tooltip.appendChild(this.createNode('SPAN', null, 'japp-separator'));

        tooltip.appendChild(this.createNode('SPAN', 'japp-tooltip-title'));

        document.body.appendChild(tooltip);
        return tooltip;
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

    /* -------------------
       Component detection
       ------------------- */

    loadPreviewVersion: function() {
        const url = this.getMappedUrl('', {useMgmtOrigin: true, suppressBuiltInUrlTransform: true});
        url.searchParams.set('wcmmode', 'preview');
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url.href,
                onload: response => {
                    const responseText = response.responseText;
                    const parsingContainer = document.createElement('DIV');
                    parsingContainer.innerHTML = responseText;
                    const cqTags = parsingContainer.querySelectorAll('cq[data-path]');
                    const componentElements = this.prepareComponentElements(cqTags);
                    resolve(componentElements);
                }
            });
        });
    },

    prepareComponentElements: function(cqTags) {
        const result = [];
        for (const cqTag of cqTags) {
            const targetElement = cqTag.previousElementSibling;
            if (!targetElement || targetElement.matches('.newpar.new.section')) {
                continue;
            }
            targetElement.dataset.componentConfig = cqTag.dataset.config;
            result.push(targetElement);
        }
        return result;
    },

    findAnalog: function(element, allElements) {
        if (element.id) {
            return document.getElementById(element.id);
        }
        let selector = '.' + element.className.replace(/\s+/g, '.').replace(/^\.+|\.+$/g, '');
        if (selector === '.') {
            selector = element.tagName;
        }
        const elementIndex = Array.from(allElements).filter(elt => elt.matches(selector)).indexOf(element);
        const analogs = document.querySelectorAll(selector);
        return analogs.length > elementIndex ? analogs.item(elementIndex) : null;
    }
});

