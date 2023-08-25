import * as vscode from 'vscode';
import { CheckResultTreeDataProvider, registerShowDetailsCommand, registerShowMoreCommand } from './CheckResultTreeDataProvider';
import { getToken } from './ConfigController';
import { statusVerification } from './Uploader';
import path = require('path');


export async function activate(context: vscode.ExtensionContext) {
    getToken();

    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.checkResult.checkProject', async (uri) => {
            if (uri && uri.fsPath) {
                const folderPath = uri.fsPath;
                const folderName = path.basename(folderPath);
                if (folderPath && folderName) {
                    const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
                    await config.update('projectName', folderName);
                    await config.update('projectPath', folderPath);
                    statusVerification();
                }
                else {
                    vscode.window.showErrorMessage(`文件夹${folderName}路径或名称获取异常，路径为:${folderPath}，请重试`);
                }
            }
        })
    );



    const checkResultProvider = new CheckResultTreeDataProvider();

    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.checkResult.refresh', () => {
            checkResultProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.checkResult.filterResultEditor', async () => {
            const editor = vscode.window.activeTextEditor;
            const filePath = editor && editor.document.fileName;
            const fileName = path.basename(filePath || '');
            checkResultProvider.refresh(fileName);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.checkResult.filterResultExplorer', async (uri) => {
            if (uri && uri.fsPath) {
                const filePath = uri.fsPath;
                const fileName = path.basename(filePath);
                checkResultProvider.refresh(fileName);
            }
        })
    );


    // 注册显示检测历史记录的详细信息命令
    registerShowDetailsCommand(context);
    registerShowMoreCommand(context, checkResultProvider);


    // 注册侧边栏
    vscode.window.registerTreeDataProvider('checkResult', checkResultProvider);

}

// This method is called when your extension is deactivated
export function deactivate() { }