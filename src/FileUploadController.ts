import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios, { toFormData } from 'axios';
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

    async selectFolder(serverAddress: string | undefined, config: vscode.WorkspaceConfiguration) {
        // TODO：选择工作空间下项目
        const selection = await vscode.window.showQuickPick(['文件夹'], {
            placeHolder: '请选择要上传的类型',
        });
        if (selection) {
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: selection === '文件夹',
                canSelectFiles: selection === '压缩包',
                canSelectMany: false,
                openLabel: `请选择${selection}`
            });
            if (folderUri) {
                const folderPath = path.normalize(folderUri[0].fsPath);
                this.uploadFolder(folderPath, serverAddress, selection);
                await config.update('projectPath', folderPath, vscode.ConfigurationTarget.Global);
            }
        }
    }

    async nameFolder(serverAddress: string | undefined) {
        const folderName = await vscode.window.showInputBox({
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
        return folderName;
    }


    async uploadFolder(fileOrFolderPath: string, serverAddress: string | undefined, selection: string) {
        const formData = new FormData();
        formData.append('projectName', await this.nameFolder(serverAddress));
        formData.append('engine', 'auto');
        formData.append('isUpdateCode', '1');
        formData.append('compileConfig', '{"Java":"Oracle JDK 1.8 8u201(推荐)","C/C++":"5e5b6ed01a9a14794dc35eab","PHP":"5.x(推荐)","Library":"","Python":"3.7(推荐)"}');
        formData.append('defectId', '5e57409394bbd91d299f2a1b');
        switch (selection) {
            case '文件夹':
                formData.append('importType', 'fileFolder');
                // 递归获取文件夹下的所有文件
                const files = await this.getFilesInFolder(fileOrFolderPath);
                // 逐个上传文件
                for (const file of files) {
                    const folderName = path.basename(fileOrFolderPath);
                    const relativePath = path.relative(fileOrFolderPath, file);
                    const fileName = path.join(folderName, relativePath);
                    const fileStream = fs.createReadStream(file);
                    formData.append('importFiles', fileStream, { filename: fileName, filepath: fileName });
                }
                break;
            case '压缩包':
                formData.append('importType', 'file');
                formData.append('importFiles', fs.createReadStream(fileOrFolderPath), fileOrFolderPath);
            default:
                break;
        }
        formData.append('organization', '0');
        formData.append('os', '64');
        formData.append('projectVersion', 'v1.0');
        try {
            const res = await axios.post(`${serverAddress}/cobot/project/createProject`, formData, {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    "Content-Type": "multipart/form-data",
                },
                timeout: 7200000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            vscode.window.showInformationMessage(res.data.msg);
        } catch (error) {
            console.error(error);
        }
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