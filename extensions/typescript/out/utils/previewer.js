"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
function getTagText(tag) {
    if (!tag.text) {
        return undefined;
    }
    switch (tag.name) {
        case 'example':
        case 'default':
            // Convert to markdown code block
            if (tag.text.match(/^\s*[~`]{3}/g)) {
                return tag.text;
            }
            return '```\n' + tag.text + '\n```';
    }
    return tag.text;
}
function plain(parts) {
    if (!parts) {
        return '';
    }
    return parts.map(part => part.text).join('');
}
exports.plain = plain;
function tagsMarkdownPreview(tags) {
    return (tags || [])
        .map(tag => {
        const label = `*@${tag.name}*`;
        const text = getTagText(tag);
        if (!text) {
            return label;
        }
        return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
    })
        .join('  \n\n');
}
exports.tagsMarkdownPreview = tagsMarkdownPreview;
function markdownDocumentation(documentation, tags) {
    const out = new vscode_1.MarkdownString();
    addmarkdownDocumentation(out, documentation, tags);
    return out;
}
exports.markdownDocumentation = markdownDocumentation;
function addmarkdownDocumentation(out, documentation, tags) {
    out.appendMarkdown(plain(documentation));
    const tagsPreview = tagsMarkdownPreview(tags);
    if (tagsPreview) {
        out.appendMarkdown('\n\n' + tagsPreview);
    }
    return out;
}
exports.addmarkdownDocumentation = addmarkdownDocumentation;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\typescript\out/utils\previewer.js.map
