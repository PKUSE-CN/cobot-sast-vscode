/* eslint-disable @typescript-eslint/naming-convention */
import axios, { AxiosProgressEvent, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { getProjectName, getProjectPath, getToken } from './ConfigController';
import { compressFolderInTemp } from './FolderZipper';
import { getCheckStatusName } from './Utils';
import FormData = require('form-data');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadProject = async (filePath: string, projectName: string) => {
    try {
        const defectConfigId = '5e57409394bbd91d299f2a1b';
        const { serviceUrl, token } = getToken();
        if (serviceUrl && token) {
            const formData = new FormData();
            const tmpfileStream = fs.createReadStream(filePath);
            formData.append('files', tmpfileStream, { filename: `${projectName}.zip` });
            let previousLoaded = 0; // 用于保存上一次进度事件的 loaded 值
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `${projectName}正在上传`,
                cancellable: false,
            }, async (progress) => {
                const encodedProjectName = encodeURIComponent(projectName);
                const response = await axios.post(`${serviceUrl}/cobot/api/project/createProjectWithZip`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': token
                    },
                    params: {
                        defectConfigId,
                        projectName: encodedProjectName,
                    },
                    timeout: 7200000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        const loaded = progressEvent.loaded || 0;
                        const total = progressEvent.total || 100000; // 设置合适的初始值
                        const increment = loaded - previousLoaded; // 计算增量
                        const incrementComplete = (increment * 100) / total;
                        const percentCompleted = Math.round((loaded * 100) / total);
                        progress.report({ increment: incrementComplete, message: `${percentCompleted}%` });
                        previousLoaded = loaded; // 更新上一次进度事件的 loaded 值
                    },
                });
                vscode.window.showInformationMessage(response.data.msg);
                console.log('请求成功:', response);
            });
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
};

export const updateProject = async (filePath: string, projectName: string) => {
    try {
        const defectConfigId = '5e57409394bbd91d299f2a1b';
        const { serviceUrl, token } = getToken();
        if (serviceUrl && token) {
            const formData = new FormData();
            const tmpfileStream = fs.createReadStream(filePath);
            formData.append('importFiles', tmpfileStream, { filename: `${projectName}.zip` });
            let previousLoaded = 0; // 用于保存上一次进度事件的 loaded 值
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `${projectName}正在更新代码`,
                cancellable: false,
            }, async (progress) => {
                const encodedProjectName = encodeURIComponent(projectName);
                const response = await axios.post(`${serviceUrl}/cobot/api/project/${encodedProjectName}/updateCode`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': token
                    },
                    params: {
                        defectConfigId,
                    },
                    timeout: 7200000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        const loaded = progressEvent.loaded || 0;
                        const total = progressEvent.total || 100000; // 设置合适的初始值
                        const increment = loaded - previousLoaded; // 计算增量
                        const incrementComplete = (increment * 100) / total;
                        const percentCompleted = Math.round((loaded * 100) / total);
                        progress.report({ increment: incrementComplete, message: `${percentCompleted}%` });
                        previousLoaded = loaded; // 更新上一次进度事件的 loaded 值
                    },
                });
                vscode.window.showInformationMessage(response.data.msg);
                console.log('请求成功:', response);
            });
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
};


const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
let verificationTimeout: NodeJS.Timeout | undefined;
let prevStatus: number | undefined = undefined;

export const afterUpload = async (projectName: string) => {
    await checkProject(projectName);
    await statusVerification({ 刚完成上传: true, 首次调用: false });
};

export const checkProject = async (projectName: string) => {
    const { serviceUrl, token } = getToken();
    const encodedProjectName = encodeURIComponent(projectName);
    const res = await axios.patch(`${serviceUrl}/cobot/api/project/${encodedProjectName}/check`, { "extension": {} }, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: token,
        }
    });
    vscode.window.showInformationMessage(res.data.msg);
};

const scheduleVerification = (projectName: string, analysisStatus?: number, 刚完成上传 = false) => {
    if (verificationTimeout) {
        clearTimeout(verificationTimeout);
    }

    verificationTimeout = setTimeout(async () => {
        statusBar.text = `${projectName}: $(sync~spin)${getCheckStatusName(analysisStatus)}`;
        statusBar.show();
        await statusVerification({ 刚完成上传, 首次调用: false });
    }, 1000);
};
const showProgress = async (projectName: string, encodedProjectName: string, serviceUrl: string, token: string, res: AxiosResponse<any, any>) => {
    return new Promise<void>(async (resolve) => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${projectName}正在检测`,
            cancellable: false,
        }, async (progress) => {
            let status = res.data.data?.analysisStatus;
            let lastRate = res.data.data?.checkProgress === 100 ? 0 : res.data.data?.checkProgress;
            while (status === 1) {
                const response = await axios.get(`${serviceUrl}/cobot/api/project/${encodedProjectName}/checkStatus`, {
                    headers: {
                        Authorization: token,
                    }
                });
                status = response.data.data?.analysisStatus;
                if (status === 2) { break; }
                const rate = response.data.data?.checkProgress === 100 ? 0 : response.data.data?.checkProgress;;
                const increment = rate - lastRate;
                lastRate = rate;
                if (rate === 100) {
                    // progress.report({ message: `检测完成！`, increment: increment });
                } else {
                    progress.report({ message: `检测中，进度${rate}%`, increment: increment });
                    statusBar.text = `${projectName}：$(sync~spin)检测中${rate}%`;
                    statusBar.show();
                }
                await delay(1000);
            }
            resolve();
        });
    });
};

interface 状态 {
    首次调用: boolean,
    刚完成上传: boolean
}

export const statusVerification = async ({ 首次调用, 刚完成上传 }: 状态 = { 首次调用: true, 刚完成上传: false }) => {
    const { serviceUrl, token } = getToken();
    const projectName = getProjectName();
    const projectPath = getProjectPath();
    if (serviceUrl && token && projectName && projectPath) {
        const encodedProjectName = encodeURIComponent(projectName);
        const res = await axios.get(`${serviceUrl}/cobot/api/project/${encodedProjectName}/checkStatus`, {
            headers: {
                Authorization: token,
            }
        });
        const status = res.data.data?.analysisStatus;

        if (刚完成上传) {
            // TODO 这部分应该可以优化掉
            if (status !== 2) {
                if (status === 1) {
                    await showProgress(projectName, encodedProjectName, serviceUrl, token, res);
                }
                scheduleVerification(projectName, status, true);
            } else {
                vscode.window.showInformationMessage(`${projectName}: 检测完成`);
                statusBar.text = `${projectName}: $(check)${getCheckStatusName(await status)}`;
                statusBar.show();
                vscode.commands.executeCommand('cobot-sast-vscode.checkResult.refresh');
            }
        } else {
            if (res.data.msg !== '项目不存在') {
                // 有代码无检测结果
                if (status === 0 || status === 4) {
                    if (!首次调用 && status === 4) {
                        vscode.window.showErrorMessage(`${projectName}: ${getCheckStatusName(status)}`);
                        statusBar.text = `${projectName}: $(error)${getCheckStatusName(res.data.data?.analysisStatus)}`;
                        statusBar.show();
                    }
                    const reUpload = await vscode.window.showQuickPick([
                        { label: '是' },
                        { label: '否', description: '进行检测' }
                    ], {
                        title: `项目${getCheckStatusName(status)}，是否重新上传？`,
                        ignoreFocusOut: true,
                    });
                    if (reUpload?.label === '是') {
                        const [tmpZipPath, cleanupCallback] = await compressFolderInTemp(projectPath);
                        tmpZipPath && await updateProject(tmpZipPath, projectName);
                        cleanupCallback();
                    }
                    afterUpload(projectName);
                }
                // 检测过程中
                else if (status === 1 || status === 3 || status === 5 || status === 6) {
                    if (prevStatus !== status) {
                        vscode.window.showInformationMessage(`${projectName}: ${getCheckStatusName(status)}`);
                        prevStatus = status;
                    }
                    if (status === 1) {
                        await showProgress(projectName, encodedProjectName, serviceUrl, token, res);
                    }
                    scheduleVerification(projectName, res.data.data?.analysisStatus);
                }
                // 检测完成
                else if (status === 2) {
                    if (首次调用) {
                        const reCheck = await vscode.window.showQuickPick([
                            { label: '检测', description: '不上传重新检测' },
                            { label: '重新上传', description: '重新上传并检测' },
                            { label: '否', description: '直接获取检测结果' }
                        ], {
                            title: '项目已完成检测，是否重新检测？',
                            ignoreFocusOut: true,
                        });
                        if (reCheck?.label === '重新上传') {
                            const [tmpZipPath, cleanupCallback] = await compressFolderInTemp(projectPath);
                            tmpZipPath && await updateProject(tmpZipPath, projectName);
                            cleanupCallback();
                            afterUpload(projectName);
                            return;
                        } else if (reCheck?.label === '检测') {
                            afterUpload(projectName);
                            return;
                        }
                    } else {
                        vscode.window.showInformationMessage(`${projectName}: 检测完成`);
                    }
                    statusBar.text = `${projectName}: $(check)${getCheckStatusName(await res.data.data?.analysisStatus)}`;
                    statusBar.show();
                    vscode.commands.executeCommand('cobot-sast-vscode.checkResult.refresh');
                } else {
                    vscode.window.showErrorMessage(`状态码出错！状态码为：${status}`);
                    statusBar.text = `${projectName}: $(error)检测出错`;
                    statusBar.show();
                }
            } else {
                const [tmpZipPath, cleanupCallback] = await compressFolderInTemp(projectPath);
                tmpZipPath && await uploadProject(tmpZipPath, projectName);
                cleanupCallback();
                afterUpload(projectName);
            }
        }
    }
};