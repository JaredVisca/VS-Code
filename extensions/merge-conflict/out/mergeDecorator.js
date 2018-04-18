"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = require("vscode");
const vscode_nls_1 = require("vscode-nls");
const localize = vscode_nls_1.loadMessageBundle(__filename);
class MergeDecorator {
    constructor(context, trackerService) {
        this.context = context;
        this.decorations = {};
        this.decorationUsesWholeLine = true; // Useful for debugging, set to false to see exact match ranges
        this.updating = new Map();
        this.tracker = trackerService.createTracker('decorator');
    }
    begin(config) {
        this.config = config;
        this.registerDecorationTypes(config);
        // Check if we already have a set of active windows, attempt to track these.
        vscode.window.visibleTextEditors.forEach(e => this.applyDecorations(e));
        vscode.workspace.onDidOpenTextDocument(event => {
            this.applyDecorationsFromEvent(event);
        }, null, this.context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            this.applyDecorationsFromEvent(event.document);
        }, null, this.context.subscriptions);
        vscode.window.onDidChangeVisibleTextEditors((e) => {
            // Any of which could be new (not just the active one).
            e.forEach(e => this.applyDecorations(e));
        }, null, this.context.subscriptions);
    }
    configurationUpdated(config) {
        this.config = config;
        this.registerDecorationTypes(config);
        // Re-apply the decoration
        vscode.window.visibleTextEditors.forEach(e => {
            this.removeDecorations(e);
            this.applyDecorations(e);
        });
    }
    registerDecorationTypes(config) {
        // Dispose of existing decorations
        Object.keys(this.decorations).forEach(k => this.decorations[k].dispose());
        this.decorations = {};
        // None of our features are enabled
        if (!config.enableDecorations || !config.enableEditorOverview) {
            return;
        }
        // Create decorators
        if (config.enableDecorations || config.enableEditorOverview) {
            this.decorations['current.content'] = vscode.window.createTextEditorDecorationType(this.generateBlockRenderOptions('merge.currentContentBackground', 'editorOverviewRuler.currentContentForeground', config));
            this.decorations['incoming.content'] = vscode.window.createTextEditorDecorationType(this.generateBlockRenderOptions('merge.incomingContentBackground', 'editorOverviewRuler.incomingContentForeground', config));
            this.decorations['commonAncestors.content'] = vscode.window.createTextEditorDecorationType(this.generateBlockRenderOptions('merge.commonContentBackground', 'editorOverviewRuler.commonContentForeground', config));
        }
        if (config.enableDecorations) {
            this.decorations['current.header'] = vscode.window.createTextEditorDecorationType({
                isWholeLine: this.decorationUsesWholeLine,
                backgroundColor: new vscode.ThemeColor('merge.currentHeaderBackground'),
                color: new vscode.ThemeColor('editor.foreground'),
                outlineStyle: 'solid',
                outlineWidth: '1pt',
                outlineColor: new vscode.ThemeColor('merge.border'),
                after: {
                    contentText: ' ' + localize(0, null),
                    color: new vscode.ThemeColor('descriptionForeground')
                }
            });
            this.decorations['commonAncestors.header'] = vscode.window.createTextEditorDecorationType({
                isWholeLine: this.decorationUsesWholeLine,
                backgroundColor: new vscode.ThemeColor('merge.commonHeaderBackground'),
                color: new vscode.ThemeColor('editor.foreground'),
                outlineStyle: 'solid',
                outlineWidth: '1pt',
                outlineColor: new vscode.ThemeColor('merge.border')
            });
            this.decorations['splitter'] = vscode.window.createTextEditorDecorationType({
                color: new vscode.ThemeColor('editor.foreground'),
                outlineStyle: 'solid',
                outlineWidth: '1pt',
                outlineColor: new vscode.ThemeColor('merge.border'),
                isWholeLine: this.decorationUsesWholeLine,
            });
            this.decorations['incoming.header'] = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('merge.incomingHeaderBackground'),
                color: new vscode.ThemeColor('editor.foreground'),
                outlineStyle: 'solid',
                outlineWidth: '1pt',
                outlineColor: new vscode.ThemeColor('merge.border'),
                isWholeLine: this.decorationUsesWholeLine,
                after: {
                    contentText: ' ' + localize(1, null),
                    color: new vscode.ThemeColor('descriptionForeground')
                }
            });
        }
    }
    dispose() {
        // TODO: Replace with Map<string, T>
        Object.keys(this.decorations).forEach(name => {
            this.decorations[name].dispose();
        });
        this.decorations = {};
    }
    generateBlockRenderOptions(backgroundColor, overviewRulerColor, config) {
        let renderOptions = {};
        if (config.enableDecorations) {
            renderOptions.backgroundColor = new vscode.ThemeColor(backgroundColor);
            renderOptions.isWholeLine = this.decorationUsesWholeLine;
        }
        if (config.enableEditorOverview) {
            renderOptions.overviewRulerColor = new vscode.ThemeColor(overviewRulerColor);
            renderOptions.overviewRulerLane = vscode.OverviewRulerLane.Full;
        }
        return renderOptions;
    }
    applyDecorationsFromEvent(eventDocument) {
        for (var i = 0; i < vscode.window.visibleTextEditors.length; i++) {
            if (vscode.window.visibleTextEditors[i].document === eventDocument) {
                // Attempt to apply
                this.applyDecorations(vscode.window.visibleTextEditors[i]);
            }
        }
    }
    applyDecorations(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editor || !editor.document) {
                return;
            }
            if (!this.config || (!this.config.enableDecorations && !this.config.enableEditorOverview)) {
                return;
            }
            // If we have a pending scan from the same origin, exit early. (Cannot use this.tracker.isPending() because decorations are per editor.)
            if (this.updating.get(editor)) {
                return;
            }
            try {
                this.updating.set(editor, true);
                let conflicts = yield this.tracker.getConflicts(editor.document);
                if (vscode.window.visibleTextEditors.indexOf(editor) === -1) {
                    return;
                }
                if (conflicts.length === 0) {
                    this.removeDecorations(editor);
                    return;
                }
                // Store decorations keyed by the type of decoration, set decoration wants a "style"
                // to go with it, which will match this key (see constructor);
                let matchDecorations = {};
                let pushDecoration = (key, d) => {
                    matchDecorations[key] = matchDecorations[key] || [];
                    matchDecorations[key].push(d);
                };
                conflicts.forEach(conflict => {
                    // TODO, this could be more effective, just call getMatchPositions once with a map of decoration to position
                    if (!conflict.current.decoratorContent.isEmpty) {
                        pushDecoration('current.content', { range: conflict.current.decoratorContent });
                    }
                    if (!conflict.incoming.decoratorContent.isEmpty) {
                        pushDecoration('incoming.content', { range: conflict.incoming.decoratorContent });
                    }
                    conflict.commonAncestors.forEach(commonAncestorsRegion => {
                        if (!commonAncestorsRegion.decoratorContent.isEmpty) {
                            pushDecoration('commonAncestors.content', { range: commonAncestorsRegion.decoratorContent });
                        }
                    });
                    if (this.config.enableDecorations) {
                        pushDecoration('current.header', { range: conflict.current.header });
                        pushDecoration('splitter', { range: conflict.splitter });
                        pushDecoration('incoming.header', { range: conflict.incoming.header });
                        conflict.commonAncestors.forEach(commonAncestorsRegion => {
                            pushDecoration('commonAncestors.header', { range: commonAncestorsRegion.header });
                        });
                    }
                });
                // For each match we've generated, apply the generated decoration with the matching decoration type to the
                // editor instance. Keys in both matches and decorations should match.
                Object.keys(matchDecorations).forEach(decorationKey => {
                    let decorationType = this.decorations[decorationKey];
                    if (decorationType) {
                        editor.setDecorations(decorationType, matchDecorations[decorationKey]);
                    }
                });
            }
            finally {
                this.updating.delete(editor);
            }
        });
    }
    removeDecorations(editor) {
        // Remove all decorations, there might be none
        Object.keys(this.decorations).forEach(decorationKey => {
            // Race condition, while editing the settings, it's possible to
            // generate regions before the configuration has been refreshed
            let decorationType = this.decorations[decorationKey];
            if (decorationType) {
                editor.setDecorations(decorationType, []);
            }
        });
    }
}
exports.default = MergeDecorator;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/79b44aa704ce542d8ca4a3cc44cfca566e7720f1/extensions\merge-conflict\out/mergeDecorator.js.map
