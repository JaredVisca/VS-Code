"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class CommandManager {
    constructor() {
        this.commands = new Map();
    }
    dispose() {
        for (const registration of this.commands.values()) {
            registration.dispose();
        }
        this.commands.clear();
    }
    register(command) {
        this.registerCommand(command.id, command.execute, command);
        return command;
    }
    registerCommand(id, impl, thisArg) {
        if (this.commands.has(id)) {
            return;
        }
        this.commands.set(id, vscode.commands.registerCommand(id, impl, thisArg));
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/79b44aa704ce542d8ca4a3cc44cfca566e7720f1/extensions\typescript\out/utils\commandManager.js.map
