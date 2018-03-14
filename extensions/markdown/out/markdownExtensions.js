"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const resolveExtensionResources = (extension, stylePath) => {
    const resource = vscode.Uri.parse(stylePath);
    if (resource.scheme) {
        return resource;
    }
    return vscode.Uri.file(path.join(extension.extensionPath, stylePath));
};
function loadMarkdownExtensions(contentProvider, engine) {
    for (const extension of vscode.extensions.all) {
        const contributes = extension.packageJSON && extension.packageJSON.contributes;
        if (!contributes) {
            continue;
        }
        tryLoadPreviewStyles(contributes, contentProvider, extension);
        tryLoadPreviewScripts(contributes, contentProvider, extension);
        tryLoadMarkdownItPlugins(contributes, extension, engine);
    }
}
exports.loadMarkdownExtensions = loadMarkdownExtensions;
function tryLoadMarkdownItPlugins(contributes, extension, engine) {
    if (contributes['markdown.markdownItPlugins']) {
        extension.activate().then(() => {
            if (extension.exports && extension.exports.extendMarkdownIt) {
                engine.addPlugin((md) => extension.exports.extendMarkdownIt(md));
            }
        });
    }
}
function tryLoadPreviewScripts(contributes, contentProvider, extension) {
    const scripts = contributes['markdown.previewScripts'];
    if (scripts && Array.isArray(scripts)) {
        for (const script of scripts) {
            try {
                contentProvider.addScript(resolveExtensionResources(extension, script));
            }
            catch (e) {
                // noop
            }
        }
    }
}
function tryLoadPreviewStyles(contributes, contentProvider, extension) {
    const styles = contributes['markdown.previewStyles'];
    if (styles && Array.isArray(styles)) {
        for (const style of styles) {
            try {
                contentProvider.addStyle(resolveExtensionResources(extension, style));
            }
            catch (e) {
                // noop
            }
        }
    }
}
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\markdown\out/markdownExtensions.js.map
