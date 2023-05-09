import * as vscode from 'vscode';
import { CheckResultTreeDataProvider, registerShowDetailsCommand, registerShowMoreCommand } from './CheckResultTreeDataProvider';

import axios from 'axios';
import { LoginController, loginCommand } from './LoginController';
import { FileUploadController } from './FileUploadController';
import { WebSocket } from 'ws';



export async function activate(context: vscode.ExtensionContext) {
    const loginController = new LoginController(context);
    const { serverAddress, username, password } = loginController.getConfig();

    if (!serverAddress || !username || !password) {
        vscode.window.showInformationMessage('您还没有登录，是否现在登录？', '是', '否').then(async (value) => {
            if (value === '是') {
                // 执行登录操作
                await loginController.login();
            }
        });
    } else {
        await loginController.login();
    }



    context.subscriptions.push(vscode.commands.registerCommand('cobot-sast-vscode.getList', async () => {
        try {
            const { serverAddress } = loginController.getConfig();
            const res = await axios.get(`${serverAddress}/cobot/project/listProjectByFilter?pageNum=0&pageSize=20&sortBy=desc&sortName=modifyDate&star=false`);
            console.log(res);
        } catch (error) {
            console.log(error);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('cobot-sast-vscode.checkProject', async () => {
        const { serverAddress, config } = loginController.getConfig();
        try {
            // TODO: 从设置里获取ID
            const searchName = await vscode.window.showInputBox({
                prompt: '请输入项目名',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value) {
                        return '项目名不能为空';
                    }
                    return '';
                },
            });
            const res = await axios.get(`${serverAddress}/cobot/project/listProjectByFilter?pageNum=0&pageSize=20&sortBy=desc&sortName=modifyDate&star=false&projectName=${searchName}`);
            console.log(res);
            const selection: any = await vscode.window.showQuickPick(res.data.data.projects.map((x: any) => ({ label: x.projectName, description: x.checkDate, projectId: x.id, analysisStatus: x.analysisStatus })), {
                placeHolder: '请选择要检测的项目',
                ignoreFocusOut: true,
            });
            await config.update('projectId', selection.projectId, vscode.ConfigurationTarget.Global);
            if (selection) {
                if (selection.analysisStatus === 2) {
                    const reCheck = await vscode.window.showQuickPick([{ label: '是' }, { label: '否', description: '直接获取检测结果' }], {
                        title: '项目已完成检测，是否重新检测？',
                        ignoreFocusOut: true,
                    });
                    if (reCheck?.label !== '是') {
                        // TODO: 获取检测结果
                        vscode.commands.executeCommand('cobot-sast-vscode.checkResult.refresh');
                        return;
                    }
                }
                if (selection.analysisStatus !== 1) {
                    const inQueue = await axios.post(`${serverAddress}/cobot/currentCheckList/batchAdd`, { projectIdList: [selection.projectId] });
                    if (!inQueue.data.areSuccess) {
                        // TODO：补一个retry
                        vscode.window.showErrorMessage('开始检测失败，请重试');
                        return;
                    }
                }
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `项目${selection.label}`,
                }, (progress) => {
                    return new Promise<void>(async (resolve, reject) => {
                        const ws = new WebSocket(`${serverAddress?.replace(/^http/, 'ws')}/cobot/websocket/check/${selection.projectId}`, {
                            timeout: 1000,
                        });
                        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                        ws.onopen = e => {
                            console.log(e);
                            progress.report({ message: `队列中`, increment: 0 });
                            statusBar.show();
                            statusBar.text = `${selection.label}：开始检测`;
                        };
                        let lastRate = 0;
                        ws.onmessage = (event: any) => {
                            console.log(event);
                            if (event.data.startsWith(`rate`)) {
                                const rate = Number(event.data.split(`:`)[1]);
                                const increment = rate - lastRate;
                                lastRate = rate;
                                progress.report({ message: `检测中，进度${rate}%`, increment: increment });
                                statusBar.text = `${selection.label}：$(sync~spin)检测中${rate}%`;
                                if (rate === 100) {
                                    progress.report({ message: `检测完成！`, increment: increment });
                                    vscode.window.showInformationMessage(`${selection.label}检测完成！`);
                                    statusBar.text = `${selection.label}：检测完成`;
                                    // TODO: 获取检测结果
                                    vscode.commands.executeCommand('cobot-sast-vscode.checkResult.refresh');
                                    resolve();
                                }
                            }
                        };
                        ws.onclose = (e) => {
                            console.log('关闭:', e.reason);
                            if (statusBar.text !== `${selection.label}：检测完成`) {
                                statusBar.text !== `${selection.label}：检测出错$(error)`;
                            } else {
                                statusBar.dispose();
                            }
                            reject(e);
                        };
                    });
                });
            }
            // vscode.window.showInformationMessage(res.data);
        } catch (error) {
            console.log(error);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('cobot-sast-vscode.uploadProject', () => {
        const { serverAddress, config } = loginController.getConfig();
        const fileTestController = new FileUploadController();
        fileTestController.selectFolder(serverAddress, config);
    }));

    const checkResultProvider = new CheckResultTreeDataProvider();

    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.checkResult.refresh', () => {
            checkResultProvider.refresh();
        })
    );


    // 注册显示检测历史记录的详细信息命令
    registerShowDetailsCommand(context);
    registerShowMoreCommand(context, checkResultProvider);

    loginCommand(context);

    // 注册侧边栏
    vscode.window.registerTreeDataProvider('checkResult', checkResultProvider);

}

// This method is called when your extension is deactivated
export function deactivate() { }