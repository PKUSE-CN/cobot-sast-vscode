import * as vscode from 'vscode';

export function saveUsernameAndPassword(username: string | undefined, password: string | undefined) {
    const config = vscode.workspace.getConfiguration('cobot-code-checker');
    config.update('username', username, vscode.ConfigurationTarget.Global);
    config.update('password', password, vscode.ConfigurationTarget.Global);
}
