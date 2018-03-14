/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nls = require("vscode-nls");
const localize = nls.config(process.env.VSCODE_NLS_CONFIG)(__filename);
const vscode_1 = require("vscode");
const git_1 = require("./git");
const model_1 = require("./model");
const commands_1 = require("./commands");
const contentProvider_1 = require("./contentProvider");
const decorationProvider_1 = require("./decorationProvider");
const askpass_1 = require("./askpass");
const util_1 = require("./util");
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
const api_1 = require("./api");
function init(context, outputChannel, disposables) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, version, aiKey } = require(context.asAbsolutePath('./package.json'));
        const telemetryReporter = new vscode_extension_telemetry_1.default(name, version, aiKey);
        disposables.push(telemetryReporter);
        const pathHint = vscode_1.workspace.getConfiguration('git').get('path');
        const info = yield git_1.findGit(pathHint, path => outputChannel.appendLine(localize(0, null, path)));
        const askpass = new askpass_1.Askpass();
        const env = yield askpass.getEnv();
        const git = new git_1.Git({ gitPath: info.path, version: info.version, env });
        const model = new model_1.Model(git, context.globalState);
        disposables.push(model);
        const onRepository = () => vscode_1.commands.executeCommand('setContext', 'gitOpenRepositoryCount', `${model.repositories.length}`);
        model.onDidOpenRepository(onRepository, null, disposables);
        model.onDidCloseRepository(onRepository, null, disposables);
        onRepository();
        outputChannel.appendLine(localize(1, null, info.version, info.path));
        const onOutput = (str) => outputChannel.append(str);
        git.onOutput.addListener('log', onOutput);
        disposables.push(util_1.toDisposable(() => git.onOutput.removeListener('log', onOutput)));
        disposables.push(new commands_1.CommandCenter(git, model, outputChannel, telemetryReporter), new contentProvider_1.GitContentProvider(model), new decorationProvider_1.GitDecorations(model));
        yield checkGitVersion(info);
        return model;
    });
}
function _activate(context, disposables) {
    return __awaiter(this, void 0, void 0, function* () {
        const outputChannel = vscode_1.window.createOutputChannel('Git');
        vscode_1.commands.registerCommand('git.showOutput', () => outputChannel.show());
        disposables.push(outputChannel);
        try {
            return yield init(context, outputChannel, disposables);
        }
        catch (err) {
            if (!/Git installation not found/.test(err.message || '')) {
                throw err;
            }
            const config = vscode_1.workspace.getConfiguration('git');
            const shouldIgnore = config.get('ignoreMissingGitWarning') === true;
            if (shouldIgnore) {
                return;
            }
            console.warn(err.message);
            outputChannel.appendLine(err.message);
            outputChannel.show();
            const download = localize(2, null);
            const neverShowAgain = localize(3, null);
            const choice = yield vscode_1.window.showWarningMessage(localize(4, null), download, neverShowAgain);
            if (choice === download) {
                vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://git-scm.com/'));
            }
            else if (choice === neverShowAgain) {
                yield config.update('ignoreMissingGitWarning', true, true);
            }
        }
    });
}
function activate(context) {
    const disposables = [];
    context.subscriptions.push(new vscode_1.Disposable(() => vscode_1.Disposable.from(...disposables).dispose()));
    const activatePromise = _activate(context, disposables);
    const modelPromise = activatePromise.then(model => model || Promise.reject('Git model not found'));
    activatePromise.catch(err => console.error(err));
    return api_1.createApi(modelPromise);
}
exports.activate = activate;
function checkGitVersion(info) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = vscode_1.workspace.getConfiguration('git');
        const shouldIgnore = config.get('ignoreLegacyWarning') === true;
        if (shouldIgnore) {
            return;
        }
        if (!/^[01]/.test(info.version)) {
            return;
        }
        const update = localize(5, null);
        const neverShowAgain = localize(6, null);
        const choice = yield vscode_1.window.showWarningMessage(localize(7, null, info.version), update, neverShowAgain);
        if (choice === update) {
            vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://git-scm.com/'));
        }
        else if (choice === neverShowAgain) {
            yield config.update('ignoreLegacyWarning', true, true);
        }
    });
}
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/0759f77bb8d86658bc935a10a64f6182c5a1eeba/extensions\git\out/main.js.map
