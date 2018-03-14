/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const nls = require("vscode-nls");
exports.localize = nls.config(process.env.VSCODE_NLS_CONFIG)(__filename);
function log(message) {
    vscode.debug.activeDebugConsole.appendLine(message);
}
exports.log = log;

//# sourceMappingURL=../../../out/node/extension/utilities.js.map
