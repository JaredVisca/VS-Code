/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const nls = require("vscode-nls");
const security_1 = require("../security");
const localize = nls.loadMessageBundle(__filename);
const previewStrings = {
    cspAlertMessageText: localize(0, null),
    cspAlertMessageTitle: localize(1, null),
    cspAlertMessageLabel: localize(2, null)
};
function isMarkdownFile(document) {
    return document.languageId === 'markdown'
        && document.uri.scheme !== 'markdown'; // prevent processing of own documents
}
exports.isMarkdownFile = isMarkdownFile;
function getMarkdownUri(uri) {
    if (uri.scheme === 'markdown') {
        return uri;
    }
    return uri.with({
        scheme: 'markdown',
        path: uri.path + '.rendered',
        query: uri.toString()
    });
}
exports.getMarkdownUri = getMarkdownUri;
class MarkdownPreviewConfig {
    static getConfigForResource(resource) {
        return new MarkdownPreviewConfig(resource);
    }
    constructor(resource) {
        const editorConfig = vscode.workspace.getConfiguration('editor', resource);
        const markdownConfig = vscode.workspace.getConfiguration('markdown', resource);
        const markdownEditorConfig = vscode.workspace.getConfiguration('[markdown]');
        this.scrollBeyondLastLine = editorConfig.get('scrollBeyondLastLine', false);
        this.wordWrap = editorConfig.get('wordWrap', 'off') !== 'off';
        if (markdownEditorConfig && markdownEditorConfig['editor.wordWrap']) {
            this.wordWrap = markdownEditorConfig['editor.wordWrap'] !== 'off';
        }
        this.previewFrontMatter = markdownConfig.get('previewFrontMatter', 'hide');
        this.scrollPreviewWithEditorSelection = !!markdownConfig.get('preview.scrollPreviewWithEditorSelection', true);
        this.scrollEditorWithPreview = !!markdownConfig.get('preview.scrollEditorWithPreview', true);
        this.lineBreaks = !!markdownConfig.get('preview.breaks', false);
        this.doubleClickToSwitchToEditor = !!markdownConfig.get('preview.doubleClickToSwitchToEditor', true);
        this.markEditorSelection = !!markdownConfig.get('preview.markEditorSelection', true);
        this.fontFamily = markdownConfig.get('preview.fontFamily', undefined);
        this.fontSize = Math.max(8, +markdownConfig.get('preview.fontSize', NaN));
        this.lineHeight = Math.max(0.6, +markdownConfig.get('preview.lineHeight', NaN));
        this.styles = markdownConfig.get('styles', []);
    }
    isEqualTo(otherConfig) {
        for (let key in this) {
            if (this.hasOwnProperty(key) && key !== 'styles') {
                if (this[key] !== otherConfig[key]) {
                    return false;
                }
            }
        }
        // Check styles
        if (this.styles.length !== otherConfig.styles.length) {
            return false;
        }
        for (let i = 0; i < this.styles.length; ++i) {
            if (this.styles[i] !== otherConfig.styles[i]) {
                return false;
            }
        }
        return true;
    }
}
class PreviewConfigManager {
    constructor() {
        this.previewConfigurationsForWorkspaces = new Map();
    }
    loadAndCacheConfiguration(resource) {
        const config = MarkdownPreviewConfig.getConfigForResource(resource);
        this.previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
        return config;
    }
    shouldUpdateConfiguration(resource) {
        const key = this.getKey(resource);
        const currentConfig = this.previewConfigurationsForWorkspaces.get(key);
        const newConfig = MarkdownPreviewConfig.getConfigForResource(resource);
        return (!currentConfig || !currentConfig.isEqualTo(newConfig));
    }
    getKey(resource) {
        const folder = vscode.workspace.getWorkspaceFolder(resource);
        if (!folder) {
            return '';
        }
        return folder.uri.toString();
    }
}
class MDDocumentContentProvider {
    constructor(engine, context, cspArbiter, logger) {
        this.engine = engine;
        this.context = context;
        this.cspArbiter = cspArbiter;
        this.logger = logger;
        this._onDidChange = new vscode.EventEmitter();
        this._waiting = false;
        this.previewConfigurations = new PreviewConfigManager();
        this.extraStyles = [];
        this.extraScripts = [];
    }
    addScript(resource) {
        this.extraScripts.push(resource);
    }
    addStyle(resource) {
        this.extraStyles.push(resource);
    }
    getMediaPath(mediaFile) {
        return vscode.Uri.file(this.context.asAbsolutePath(path.join('media', mediaFile))).toString();
    }
    fixHref(resource, href) {
        if (!href) {
            return href;
        }
        // Use href if it is already an URL
        const hrefUri = vscode.Uri.parse(href);
        if (['file', 'http', 'https'].indexOf(hrefUri.scheme) >= 0) {
            return hrefUri.toString();
        }
        // Use href as file URI if it is absolute
        if (path.isAbsolute(href)) {
            return vscode.Uri.file(href).toString();
        }
        // use a workspace relative path if there is a workspace
        let root = vscode.workspace.getWorkspaceFolder(resource);
        if (root) {
            return vscode.Uri.file(path.join(root.uri.fsPath, href)).toString();
        }
        // otherwise look relative to the markdown file
        return vscode.Uri.file(path.join(path.dirname(resource.fsPath), href)).toString();
    }
    computeCustomStyleSheetIncludes(resource, config) {
        if (config.styles && Array.isArray(config.styles)) {
            return config.styles.map(style => {
                return `<link rel="stylesheet" class="code-user-style" data-source="${style.replace(/"/g, '&quot;')}" href="${this.fixHref(resource, style)}" type="text/css" media="screen">`;
            }).join('\n');
        }
        return '';
    }
    getSettingsOverrideStyles(nonce, config) {
        return `<style nonce="${nonce}">
			body {
				${config.fontFamily ? `font-family: ${config.fontFamily};` : ''}
				${isNaN(config.fontSize) ? '' : `font-size: ${config.fontSize}px;`}
				${isNaN(config.lineHeight) ? '' : `line-height: ${config.lineHeight};`}
			}
		</style>`;
    }
    getStyles(resource, nonce, config) {
        const baseStyles = [
            this.getMediaPath('markdown.css'),
            this.getMediaPath('tomorrow.css')
        ].concat(this.extraStyles.map(resource => resource.toString()));
        return `${baseStyles.map(href => `<link rel="stylesheet" type="text/css" href="${href}">`).join('\n')}
			${this.getSettingsOverrideStyles(nonce, config)}
			${this.computeCustomStyleSheetIncludes(resource, config)}`;
    }
    getScripts(nonce) {
        const scripts = [this.getMediaPath('main.js')].concat(this.extraScripts.map(resource => resource.toString()));
        return scripts
            .map(source => `<script async src="${source}" nonce="${nonce}" charset="UTF-8"></script>`)
            .join('\n');
    }
    async provideTextDocumentContent(uri) {
        const sourceUri = vscode.Uri.parse(uri.query);
        let initialLine = undefined;
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.toString() === sourceUri.toString()) {
            initialLine = editor.selection.active.line;
        }
        const document = await vscode.workspace.openTextDocument(sourceUri);
        const config = this.previewConfigurations.loadAndCacheConfiguration(sourceUri);
        const initialData = {
            previewUri: uri.toString(),
            source: sourceUri.toString(),
            line: initialLine,
            scrollPreviewWithEditorSelection: config.scrollPreviewWithEditorSelection,
            scrollEditorWithPreview: config.scrollEditorWithPreview,
            doubleClickToSwitchToEditor: config.doubleClickToSwitchToEditor,
            disableSecurityWarnings: this.cspArbiter.shouldDisableSecurityWarnings()
        };
        this.logger.log('provideTextDocumentContent', initialData);
        // Content Security Policy
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        const csp = this.getCspForResource(sourceUri, nonce);
        const body = await this.engine.render(sourceUri, config.previewFrontMatter === 'hide', document.getText());
        return `<!DOCTYPE html>
			<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				${csp}
				<meta id="vscode-markdown-preview-data" data-settings="${JSON.stringify(initialData).replace(/"/g, '&quot;')}" data-strings="${JSON.stringify(previewStrings).replace(/"/g, '&quot;')}">
				<script src="${this.getMediaPath('csp.js')}" nonce="${nonce}"></script>
				<script src="${this.getMediaPath('loading.js')}" nonce="${nonce}"></script>
				${this.getStyles(sourceUri, nonce, config)}
				<base href="${document.uri.toString(true)}">
			</head>
			<body class="vscode-body ${config.scrollBeyondLastLine ? 'scrollBeyondLastLine' : ''} ${config.wordWrap ? 'wordWrap' : ''} ${config.markEditorSelection ? 'showEditorSelection' : ''}">
				${body}
				<div class="code-line" data-line="${document.lineCount}"></div>
				${this.getScripts(nonce)}
			</body>
			</html>`;
    }
    updateConfiguration() {
        // update all generated md documents
        for (const document of vscode.workspace.textDocuments) {
            if (document.uri.scheme === 'markdown') {
                const sourceUri = vscode.Uri.parse(document.uri.query);
                if (this.previewConfigurations.shouldUpdateConfiguration(sourceUri)) {
                    this.update(document.uri);
                }
            }
        }
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    update(uri) {
        if (!this._waiting) {
            this._waiting = true;
            setTimeout(() => {
                this._waiting = false;
                this._onDidChange.fire(uri);
            }, 300);
        }
    }
    getCspForResource(resource, nonce) {
        switch (this.cspArbiter.getSecurityLevelForResource(resource)) {
            case security_1.MarkdownPreviewSecurityLevel.AllowInsecureContent:
                return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data:; media-src 'self' http: https: data:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' http: https: data:; font-src 'self' http: https: data:;">`;
            case security_1.MarkdownPreviewSecurityLevel.AllowScriptsAndAllContent:
                return '';
            case security_1.MarkdownPreviewSecurityLevel.Strict:
            default:
                return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: data:; media-src 'self' https: data:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https: data:; font-src 'self' https: data:;">`;
        }
    }
}
exports.MDDocumentContentProvider = MDDocumentContentProvider;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\markdown\out/features\previewContentProvider.js.map
