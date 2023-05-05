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

    async selectFolder(serverAddress: string | undefined) {
        const selection = await vscode.window.showQuickPick(['压缩包', '文件夹'], {
            placeHolder: '请选择要上传的类型',
        });
        if (selection) {
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: selection === '文件夹',
                canSelectFiles: selection === '压缩包',
                filters: selection === '压缩包' ? { '压缩包': ['7z', 'ace', 'ain', 'alz', 'apz', 'ar', 'arc', 'ari', 'arj', 'axx', 'bh', 'bhx', 'boo', 'bz', 'bza', 'bz2', 'c00', 'c01', 'c02', 'cab', 'car', 'cbr', 'cbz', 'cp9', 'cpgz', 'cpt', 'dar', 'dd', 'dgc', 'efw', 'f', 'gca', 'gz', 'ha', 'hbc', 'hbc2', 'hbe', 'hki', 'hki1', 'hki2', 'hki3', 'hpk', 'hyp', 'ice', 'imp', 'ipk', 'ish', 'jar', 'jgz', 'jic', 'kgb', 'kz', 'lbr', 'lha', 'lnx', 'lqr', 'lz4', 'lzh', 'lzm', 'lzma', 'lzo', 'lzx', 'md', 'mint', 'mou', 'mpkg', 'mzp', 'nz', 'p7m', 'package', 'pae', 'pak', 'paq6', 'paq7', 'paq8', 'par', 'par2', 'pbi', 'pcv', 'pea', 'pf', 'pim', 'pit', 'piz', 'puz', 'pwa', 'qda', 'r00', 'r01', 'r02', 'r03', 'rk', 'rnc', 'rpm', 'rte', 'rz', 'rzs', 's00', 's01', 's02', 's7z', 'sar', 'sdn', 'sea', 'sfs', 'sfx', 'sh', 'shar', 'shk', 'shr', 'sit', 'sitx', 'spt', 'sqx', 'sqz', 'tar', 'taz', 'tbz', 'tbz2', 'tgz', 'tlz', 'tlz4', 'txz', 'uc2', 'uha', 'uue', 'wot', 'xef', 'xx', 'xxe', 'xz', 'y', 'yz', 'yz1', 'z', 'zap', 'zip', 'zipx', 'zix', 'zoo', 'zz', 'exe'] } : undefined,
                canSelectMany: false,
                openLabel: `请选择${selection}`
            });
            if (folderUri) {
                console.log(folderUri);
                this.uploadFolder(folderUri[0].path, serverAddress, selection);
            }
        }
    }

    async uploadFolder(fileOrFolderPath: string, serverAddress: string | undefined, selection: string) {
        const formData = new FormData();
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
                    const fileBuffer = fs.readFileSync(file);
                    const fileBlob = new Blob([fileBuffer]);
                    formData.append('importFiles', fileBlob, file);
                }
                break;
            case '压缩包':
                formData.append('importType', 'file');
                formData.append('importFiles', fs.createReadStream(fileOrFolderPath), path.basename(fileOrFolderPath));
            default:
                break;
        }
        formData.append('organization', '0');
        formData.append('os', '64');
        formData.append('projectName', 'vscode-extension-test');
        formData.append('projectVersion', 'v1.0');

        try {
            const res = await axios.post(`${serverAddress}/cobot/project/createProject`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                timeout: 7200000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            console.log(res);
            vscode.window.showInformationMessage(res.data.msg);
        } catch (error) {
            console.log(error);
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