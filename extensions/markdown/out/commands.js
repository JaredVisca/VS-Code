"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const nls = require("vscode-nls");
const localize = nls.config(process.env.VSCODE_NLS_CONFIG)(__filename);
const vscode = require("vscode");
const path = require("path");
const previewContentProvider_1 = require("./features/previewContentProvider");
const tableOfContentsProvider_1 = require("./tableOfContentsProvider");
function getViewColumn(sideBySide) {
    const active = vscode.window.activeTextEditor;
    if (!active) {
        return vscode.ViewColumn.One;
    }
    if (!sideBySide) {
        return active.viewColumn;
    }
    switch (active.viewColumn) {
        case vscode.ViewColumn.One:
            return vscode.ViewColumn.Two;
        case vscode.ViewColumn.Two:
            return vscode.ViewColumn.Three;
    }
    return active.viewColumn;
}
function showPreview(cspArbiter, telemetryReporter, uri, sideBySide = false) {
    let resource = uri;
    if (!(resource instanceof vscode.Uri)) {
        if (vscode.window.activeTextEditor) {
            // we are relaxed and don't check for markdown files
            resource = vscode.window.activeTextEditor.document.uri;
        }
    }
    if (!(resource instanceof vscode.Uri)) {
        if (!vscode.window.activeTextEditor) {
            // this is most likely toggling the preview
            return vscode.commands.executeCommand('markdown.showSource');
        }
        // nothing found that could be shown or toggled
        return;
    }
    const thenable = vscode.commands.executeCommand('vscode.previewHtml', previewContentProvider_1.getMarkdownUri(resource), getViewColumn(sideBySide), localize(0, null, path.basename(resource.fsPath)), {
        allowScripts: true,
        allowSvgs: cspArbiter.shouldAllowSvgsForResource(resource)
    });
    telemetryReporter.sendTelemetryEvent('openPreview', {
        where: sideBySide ? 'sideBySide' : 'inPlace',
        how: (uri instanceof vscode.Uri) ? 'action' : 'pallete'
    });
    return thenable;
}
class ShowPreviewCommand {
    constructor(cspArbiter, telemetryReporter) {
        this.cspArbiter = cspArbiter;
        this.telemetryReporter = telemetryReporter;
        this.id = 'markdown.showPreview';
    }
    execute(uri) {
        showPreview(this.cspArbiter, this.telemetryReporter, uri, false);
    }
}
exports.ShowPreviewCommand = ShowPreviewCommand;
class ShowPreviewToSideCommand {
    constructor(cspArbiter, telemetryReporter) {
        this.cspArbiter = cspArbiter;
        this.telemetryReporter = telemetryReporter;
        this.id = 'markdown.showPreviewToSide';
    }
    execute(uri) {
        showPreview(this.cspArbiter, this.telemetryReporter, uri, true);
    }
}
exports.ShowPreviewToSideCommand = ShowPreviewToSideCommand;
class ShowSourceCommand {
    constructor() {
        this.id = 'markdown.showSource';
    }
    execute(mdUri) {
        if (!mdUri) {
            return vscode.commands.executeCommand('workbench.action.navigateBack');
        }
        const docUri = vscode.Uri.parse(mdUri.query);
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.scheme === docUri.scheme && editor.document.uri.toString() === docUri.toString()) {
                return vscode.window.showTextDocument(editor.document, editor.viewColumn);
            }
        }
        return vscode.workspace.openTextDocument(docUri)
            .then(vscode.window.showTextDocument);
    }
}
exports.ShowSourceCommand = ShowSourceCommand;
class RefreshPreviewCommand {
    constructor(contentProvider) {
        this.contentProvider = contentProvider;
        this.id = 'markdown.refreshPreview';
    }
    execute(resource) {
        if (resource) {
            const source = vscode.Uri.parse(resource);
            this.contentProvider.update(source);
        }
        else if (vscode.window.activeTextEditor && previewContentProvider_1.isMarkdownFile(vscode.window.activeTextEditor.document)) {
            this.contentProvider.update(previewContentProvider_1.getMarkdownUri(vscode.window.activeTextEditor.document.uri));
        }
        else {
            // update all generated md documents
            for (const document of vscode.workspace.textDocuments) {
                if (document.uri.scheme === 'markdown') {
                    this.contentProvider.update(document.uri);
                }
            }
        }
    }
}
exports.RefreshPreviewCommand = RefreshPreviewCommand;
class ShowPreviewSecuritySelectorCommand {
    constructor(previewSecuritySelector) {
        this.previewSecuritySelector = previewSecuritySelector;
        this.id = 'markdown.showPreviewSecuritySelector';
    }
    execute(resource) {
        if (resource) {
            const source = vscode.Uri.parse(resource).query;
            this.previewSecuritySelector.showSecutitySelectorForResource(vscode.Uri.parse(source));
        }
        else {
            if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'markdown') {
                this.previewSecuritySelector.showSecutitySelectorForResource(vscode.window.activeTextEditor.document.uri);
            }
        }
    }
}
exports.ShowPreviewSecuritySelectorCommand = ShowPreviewSecuritySelectorCommand;
class RevealLineCommand {
    constructor(logger) {
        this.logger = logger;
        this.id = '_markdown.revealLine';
    }
    execute(uri, line) {
        const sourceUri = vscode.Uri.parse(decodeURIComponent(uri));
        this.logger.log('revealLine', { uri, sourceUri: sourceUri.toString(), line });
        vscode.window.visibleTextEditors
            .filter(editor => previewContentProvider_1.isMarkdownFile(editor.document) && editor.document.uri.toString() === sourceUri.toString())
            .forEach(editor => {
            const sourceLine = Math.floor(line);
            const fraction = line - sourceLine;
            const text = editor.document.lineAt(sourceLine).text;
            const start = Math.floor(fraction * text.length);
            editor.revealRange(new vscode.Range(sourceLine, start, sourceLine + 1, 0), vscode.TextEditorRevealType.AtTop);
        });
    }
}
exports.RevealLineCommand = RevealLineCommand;
class DidClickCommand {
    constructor() {
        this.id = '_markdown.didClick';
    }
    execute(uri, line) {
        const sourceUri = vscode.Uri.parse(decodeURIComponent(uri));
        return vscode.workspace.openTextDocument(sourceUri)
            .then(document => vscode.window.showTextDocument(document))
            .then(editor => vscode.commands.executeCommand('revealLine', { lineNumber: Math.floor(line), at: 'center' })
            .then(() => editor))
            .then(editor => {
            if (editor) {
                editor.selection = new vscode.Selection(new vscode.Position(Math.floor(line), 0), new vscode.Position(Math.floor(line), 0));
            }
        });
    }
}
exports.DidClickCommand = DidClickCommand;
class MoveCursorToPositionCommand {
    constructor() {
        this.id = '_markdown.moveCursorToPosition';
    }
    execute(line, character) {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        const position = new vscode.Position(line, character);
        const selection = new vscode.Selection(position, position);
        vscode.window.activeTextEditor.revealRange(selection);
        vscode.window.activeTextEditor.selection = selection;
    }
}
exports.MoveCursorToPositionCommand = MoveCursorToPositionCommand;
class OnPreviewStyleLoadErrorCommand {
    constructor() {
        this.id = '_markdown.onPreviewStyleLoadError';
    }
    execute(resources) {
        vscode.window.showWarningMessage(localize(1, null, resources.join(', ')));
    }
}
exports.OnPreviewStyleLoadErrorCommand = OnPreviewStyleLoadErrorCommand;
class OpenDocumentLinkCommand {
    constructor(engine) {
        this.engine = engine;
        this.id = OpenDocumentLinkCommand.id;
    }
    static createCommandUri(path, fragment) {
        return vscode.Uri.parse(`command:${OpenDocumentLinkCommand.id}?${encodeURIComponent(JSON.stringify({ path, fragment }))}`);
    }
    execute(args) {
        const tryRevealLine = async (editor) => {
            if (editor && args.fragment) {
                const toc = new tableOfContentsProvider_1.TableOfContentsProvider(this.engine, editor.document);
                const line = await toc.lookup(args.fragment);
                if (!isNaN(line)) {
                    return editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.AtTop);
                }
            }
        };
        const tryOpen = async (path) => {
            if (vscode.window.activeTextEditor && previewContentProvider_1.isMarkdownFile(vscode.window.activeTextEditor.document) && vscode.window.activeTextEditor.document.uri.fsPath === path) {
                return tryRevealLine(vscode.window.activeTextEditor);
            }
            else {
                const resource = vscode.Uri.file(path);
                return vscode.workspace.openTextDocument(resource)
                    .then(vscode.window.showTextDocument)
                    .then(tryRevealLine);
            }
        };
        return tryOpen(args.path).catch(() => {
            if (path.extname(args.path) === '') {
                return tryOpen(args.path + '.md');
            }
            const resource = vscode.Uri.file(args.path);
            return Promise.resolve(void 0)
                .then(() => vscode.commands.executeCommand('vscode.open', resource))
                .then(() => void 0);
        });
    }
}
OpenDocumentLinkCommand.id = '_markdown.openDocumentLink';
exports.OpenDocumentLinkCommand = OpenDocumentLinkCommand;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\markdown\out/commands.js.map
