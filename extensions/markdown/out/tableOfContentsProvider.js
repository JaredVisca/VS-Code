/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class TableOfContentsProvider {
    constructor(engine, document) {
        this.engine = engine;
        this.document = document;
    }
    async getToc() {
        if (!this.toc) {
            try {
                this.toc = await this.buildToc(this.document);
            }
            catch (e) {
                this.toc = [];
            }
        }
        return this.toc;
    }
    async lookup(fragment) {
        const slug = TableOfContentsProvider.slugify(fragment);
        for (const entry of await this.getToc()) {
            if (entry.slug === slug) {
                return entry.line;
            }
        }
        return NaN;
    }
    async buildToc(document) {
        const toc = [];
        const tokens = await this.engine.parse(document.uri, document.getText());
        for (const heading of tokens.filter(token => token.type === 'heading_open')) {
            const lineNumber = heading.map[0];
            const line = document.lineAt(lineNumber);
            const href = TableOfContentsProvider.slugify(line.text);
            const level = TableOfContentsProvider.getHeaderLevel(heading.markup);
            if (href) {
                toc.push({
                    slug: href,
                    text: TableOfContentsProvider.getHeaderText(line.text),
                    level: level,
                    line: lineNumber,
                    location: new vscode.Location(document.uri, line.range)
                });
            }
        }
        return toc;
    }
    static getHeaderLevel(markup) {
        if (markup === '=') {
            return 1;
        }
        else if (markup === '-') {
            return 2;
        }
        else {
            return markup.length;
        }
    }
    static getHeaderText(header) {
        return header.replace(/^\s*#+\s*(.*?)\s*#*$/, (_, word) => word.trim());
    }
    static slugify(header) {
        return encodeURI(header.trim()
            .toLowerCase()
            .replace(/[\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^\-+/, '')
            .replace(/\-+$/, ''));
    }
}
exports.TableOfContentsProvider = TableOfContentsProvider;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\markdown\out/tableOfContentsProvider.js.map
