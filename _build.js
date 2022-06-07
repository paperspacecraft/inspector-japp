"use strict";

const fs = require('fs');

fs.copyFileSync('./japp.js', 'out/japp.user.js');

const original = fs.readFileSync('./japp.js', 'utf8');

let originalVersion = /\/\/\s*@version\s+([\d.]+)/.exec(original);
originalVersion = originalVersion && originalVersion[1] || '0.1';

fs.readdirSync('addons').forEach(file => {
    let text = fs.readFileSync(`addons/${file}`, 'utf8');
    text = injectVersion(text, originalVersion);
    text = injectFunctions(text, original);
    text = injectIcons(text, original);
    text = injectStyles(text, original);
    fs.writeFileSync(`out/${file.replace('.js', '.user.js')}`, text);
});

function injectVersion(text, version) {
    const versionMatch = /\/\/\s*@version\s+([\d.]+)/.exec(text);
    if (!versionMatch) {
        return text;
    }
    return text.replace(versionMatch[0], versionMatch[0].replace(versionMatch[1], version));
}

function injectStyles(text, original) {
    const stylesBlock = findLiteral(text, 'styles');
    const originalStylesBlock = findLiteral(original, 'styles');
    return text.replace(stylesBlock, originalStylesBlock);
}

function injectIcons(text, original) {
    const iconsBlock = findNestedObject(text, 'icons');
    const originalIconsBlock = findNestedObject(original, 'icons');
    if (!iconsBlock || !originalIconsBlock) {
        return;
    }

    let currentMatch;
    const iconsRegExp = /'(\w+?)':\s*'(.*?)'/g;
    const iconsObject = {};
    while ((currentMatch = iconsRegExp.exec(iconsBlock)) !== null) {
        iconsObject[currentMatch[1]] = currentMatch[2];
    }

    const originalIconsObject = {};
    while ((currentMatch = iconsRegExp.exec(originalIconsBlock)) !== null) {
        originalIconsObject[currentMatch[1]] = currentMatch[2];
    }

    Object.keys(iconsObject).forEach(key => {
        if (!iconsObject[key]) {
            iconsObject[key] = originalIconsObject[key];
        }
    })

    let newIconsBlock = '';
    Object.keys(iconsObject).forEach(key => {
        newIconsBlock += `        '${key}': '${iconsObject[key]}',\n`;
    })
    newIconsBlock = `icons: {\n${newIconsBlock}    }`;
    return text.replace(iconsBlock, newIconsBlock);
}

function injectFunctions(text, original) {
    let result = text;
    const regexp = /\w+:\sfunction\(.*?\)\s*{}/gi;
    let currentMatch;
    const emptyFunctions = [];
    while ((currentMatch = regexp.exec(text)) !== null) {
        emptyFunctions.push(currentMatch[0]);
    }
    for (const func of emptyFunctions) {
        const funcName = func.split(':')[0];
        const substitute = findFunction(original, funcName);
        if (substitute) {
            result = result.replace(func, substitute);
        }
    }
    return result;
}

function findLiteral(text, name) {
    return new RegExp(`${name}:\\s*(?:\`.*?\`|'.*?')`, 's').exec(text);
}

function findNestedObject(text, name) {
    return findBlock(text, `${name}:`);
}

function findFunction(text, name) {
    return findBlock(text, `${name}:\\s*function\\s*\\(.*?\\)`);
}

function findBlock(text, regexp) {
    const matching = (regexp instanceof RegExp ? regexp : new RegExp(regexp)).exec(text);
    if (!matching) {
        return '';
    }
    const startPos = matching.index;
    const opening = text.indexOf('{', startPos);
    if (opening < startPos) {
        return '';
    }

    let index = opening;
    let numberOfOpenings = 0;
    let numberOfClosings = 0;
    while (index < text.length) {
        const nextSymbol = text[index++];
        if (nextSymbol === '{') {
            numberOfOpenings++;
        } else if (nextSymbol === '}') {
            numberOfClosings++;
            if (numberOfClosings === numberOfOpenings) {
                return text.substring(startPos, index);
            }
        }
    }
    return '';
}
