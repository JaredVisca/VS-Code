"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const markdownEngine_1 = require("./markdownEngine");
const security_1 = require("./security");
const logger_1 = require("./logger");
const commandManager_1 = require("./commandManager");
const commands = require("./commands");
const telemetryReporter_1 = require("./telemetryReporter");
const markdownExtensions_1 = require("./markdownExtensions");
const documentLinkProvider_1 = require("./features/documentLinkProvider");
const documentSymbolProvider_1 = require("./features/documentSymbolProvider");
const previewContentProvider_1 = require("./features/previewContentProvider");
function activate(context) {
    const telemetryReporter = telemetryReporter_1.loadDefaultTelemetryReporter();
    context.subscriptions.push(telemetryReporter);
    const cspArbiter = new security_1.ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
    const engine = new markdownEngine_1.MarkdownEngine();
    const logger = new logger_1.Logger();
    const selector = 'markdown';
    const contentProvider = new previewContentProvider_1.MDDocumentContentProvider(engine, context, cspArbiter, logger);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(selector, contentProvider));
    markdownExtensions_1.loadMarkdownExtensions(contentProvider, engine);
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, new documentSymbolProvider_1.default(engine)));
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(selector, new documentLinkProvider_1.default()));
    const previewSecuritySelector = new security_1.PreviewSecuritySelector(cspArbiter, contentProvider);
    const commandManager = new commandManager_1.CommandManager();
    context.subscriptions.push(commandManager);
    commandManager.register(new commands.ShowPreviewCommand(cspArbiter, telemetryReporter));
    commandManager.register(new commands.ShowPreviewToSideCommand(cspArbiter, telemetryReporter));
    commandManager.register(new commands.ShowSourceCommand());
    commandManager.register(new commands.RefreshPreviewCommand(contentProvider));
    commandManager.register(new commands.RevealLineCommand(logger));
    commandManager.register(new commands.MoveCursorToPositionCommand());
    commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector));
    commandManager.register(new commands.OnPreviewStyleLoadErrorCommand());
    commandManager.register(new commands.DidClickCommand());
    commandManager.register(new commands.OpenDocumentLinkCommand(engine));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (previewContentProvider_1.isMarkdownFile(document)) {
            const uri = previewContentProvider_1.getMarkdownUri(document.uri);
            contentProvider.update(uri);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (previewContentProvider_1.isMarkdownFile(event.document)) {
            const uri = previewContentProvider_1.getMarkdownUri(event.document.uri);
            contentProvider.update(uri);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        logger.updateConfiguration();
        contentProvider.updateConfiguration();
    }));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
        if (previewContentProvider_1.isMarkdownFile(event.textEditor.document)) {
            const markdownFile = previewContentProvider_1.getMarkdownUri(event.textEditor.document.uri);
            logger.log('updatePreviewForSelection', { markdownFile: markdownFile.toString() });
            vscode.commands.executeCommand('_workbench.htmlPreview.postMessage', markdownFile, {
                line: event.selections[0].active.line
            });
        }
    }));
}
exports.activate = activate;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\markdown\out/extension.js.map
