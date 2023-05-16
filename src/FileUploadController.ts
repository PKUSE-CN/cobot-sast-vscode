import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios, { AxiosProgressEvent, AxiosRequestConfig, toFormData } from 'axios';
import FormData = require('form-data');
import { Blob } from 'buffer';

interface 上传参数 {
    engine: string,
    isUpdateCode: string,
    compileConfig: any,
    defectId: string,
    importType: string,
    organization: string,
    os: string,
    projectName: string,
    importFiles: string,
    projectVersion: string,
}

export class FileUploadController {
    private _uploadConfig: 上传参数;
    constructor(config?: 上传参数) {
        if (config) {
            this._uploadConfig = config;
        } else {
            this._uploadConfig = {
                engine: 'auto',
                isUpdateCode: '1',
                compileConfig: {
                    "Java": "Oracle JDK 1.8 8u201(推荐)",
                    "C/C++": "5e5b6ed01a9a14794dc35eab",
                    "PHP": "5.x(推荐)",
                    "Library": "",
                    "Python": "3.7(推荐)"
                },
                defectId: '5e57409394bbd91d299f2a1b',
                importType: 'fileFolder',
                organization: '0',
                os: '64',
                projectName: '',
                importFiles: '',
                projectVersion: 'v1.0',
            };
        }
    }

    async selectFolder() {
        const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
        const options = ['当前工作空间', '从系统中选择文件夹', '取消'];
        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: '请选择要上传的类型',
        });

        if (selection === '当前工作空间') {
            const workspaceFolder = await vscode.window.showWorkspaceFolderPick();
            if (workspaceFolder) {
                const folderPath = path.normalize(workspaceFolder.uri.fsPath);
                this.uploadFolder(folderPath);
                await config.update('projectPath', folderPath);
            }
        } else if (selection === '文件夹') {
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: '请选择文件夹',
            });

            if (folderUri) {
                const folderPath = path.normalize(folderUri[0].fsPath);
                this.uploadFolder(folderPath);
                await config.update('projectPath', folderPath);
            }
        } else {
        }
    }

    async nameFolder() {
        const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
        const serverAddress = config.get<string>('address');
        const projectName = await vscode.window.showInputBox({
            prompt: '请输入上传的项目名称',
            ignoreFocusOut: true,
            validateInput: async (value) => {
                if (!value) {
                    return '项目名称不能为空';
                }
                const res = await axios.get(`${serverAddress}/cobot/project/exits?projectName=${value}`);
                if (res.data.data) {
                    return '项目名重复！请重新输入！';
                }
                return '';
            },
        });
        return projectName;
    }


    async uploadFolder(fileOrFolderPath: string) {
        const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
        const serverAddress = config.get<string>('address');
        const formData = new FormData();
        const projectName = await this.nameFolder();
        formData.append('projectName', projectName);
        formData.append('engine', 'auto');
        formData.append('isUpdateCode', '1');
        formData.append('compileConfig', '{"Java":"Oracle JDK 1.8 8u201(推荐)","C/C++":"5e5b6ed01a9a14794dc35eab","PHP":"5.x(推荐)","Library":"","Python":"3.7(推荐)"}');
        formData.append('defectId', '5e57409394bbd91d299f2a1b');
        formData.append('importType', 'fileFolder');
        // 递归获取文件夹下的所有文件
        const files = await this.getFilesInFolder(fileOrFolderPath);
        // 逐个上传文件
        const folderName = path.basename(fileOrFolderPath);
        for (const file of files) {
            const relativePath = path.relative(fileOrFolderPath, file);
            const fileName = path.join(folderName, relativePath);
            const fileStream = fs.createReadStream(file);
            formData.append('importFiles', fileStream, { filename: fileName, filepath: fileName });
        }
        formData.append('organization', '0');
        formData.append('os', '64');
        formData.append('projectVersion', 'v1.0');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${projectName}正在上传`,
            cancellable: false,
        }, async (progress) => {
            try {
                let previousLoaded = 0; // 用于保存上一次进度事件的 loaded 值
                const res = await axios.post(`${serverAddress}/cobot/project/createProject`, formData, {
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "Content-Type": "multipart/form-data",
                    },
                    timeout: 7200000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        console.log(progressEvent);
                        const loaded = progressEvent.loaded || 0;
                        const total = progressEvent.total || 100000; // 设置合适的初始值
                        const increment = loaded - previousLoaded; // 计算增量
                        const incrementComplete = (increment * 100) / total;
                        const percentCompleted = Math.round((loaded * 100) / total);
                        progress.report({ increment: incrementComplete, message: `${percentCompleted}%` });
                        previousLoaded = loaded; // 更新上一次进度事件的 loaded 值
                    },

                });
                vscode.window.showInformationMessage(res.data.msg);
                await config.update('projectName', projectName);
            } catch (error) {
                console.error(error);
            }
        });
    }

    async getFilesInFolder(folderPath: string): Promise<string[]> {
        const files = await fs.promises.readdir(folderPath);
        const result: string[] = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isDirectory()) {
                // 如果是文件夹，则递归获取文件夹下的文件
                const subFiles = await this.getFilesInFolder(filePath);
                result.push(...subFiles);
            } else {
                // 如果是文件，则将文件路径添加到结果数组中
                result.push(filePath);
            }
        }

        return result;
    }

}