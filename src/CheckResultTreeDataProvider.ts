/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import * as vscode from 'vscode';
import { getProjectName, getToken } from './ConfigController';
import { getLevelColor } from './defectLevel';
import path = require('path');
interface FilePos {
    filePath: string,
    fileLine: number,
    fileColumn: number,
    fileColumnEnd: number,
}

class CheckResultTreeItem extends vscode.TreeItem {
    filePosition: FilePos;
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string,
        public readonly commandName: string,
        public readonly collapsible?: vscode.TreeItemCollapsibleState,
        { filePath = '', fileLine = 0, fileColumn = 0, fileColumnEnd = 0 }: Partial<FilePos> = {},
        public readonly level?: string | undefined,
    ) {
        super(label, collapsible);
        this.tooltip = description;
        this.filePosition = {
            filePath,
            fileLine,
            fileColumn,
            fileColumnEnd,
        };
        if (level) {
            this.iconPath = new vscode.ThemeIcon('bug', getLevelColor(level));
        }
        if (commandName) {
            this.command = {
                title: '展示详情',
                command: commandName,
                arguments: [this],
            };
        }
    }
}



// 创建 showMore 命令占位符
const showMorePlaceholder = new CheckResultTreeItem('showMore', '获取更多...', '', 'checkResult.showMore', 0);


export class CheckResultTreeDataProvider implements vscode.TreeDataProvider<CheckResultTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CheckResultTreeItem | undefined> = new vscode.EventEmitter<CheckResultTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CheckResultTreeItem | undefined> = this._onDidChangeTreeData.event;
    private vulnerabilities: any[] = [];
    private hasMore = true;
    private pageNum = 0;
    private pageSize = 10000;
    private total = 0;
    private fileName = '';

    // 获取树形结构的根节点
    getTreeItem(element: CheckResultTreeItem): vscode.TreeItem {
        if (element === showMorePlaceholder) {
            return showMorePlaceholder;
        }
        return element;
    }

    // 获取最近的检测问题
    async getVulnerability() {
        try {
            const { serviceUrl, token } = getToken();
            const projectName = getProjectName();
            if (serviceUrl && token && projectName) {
                const encodedProjectName = encodeURIComponent(projectName);
                const res = await axios.get(`${serviceUrl}/cobot/api/project/${encodedProjectName}/defect`, {
                    params: {
                        fileName: this.fileName,
                        sortBy: 'asc',
                        sortName: 'level',
                        pageNum: this.pageNum,
                        pageSize: this.pageSize,
                    },
                    headers: {
                        'Authorization': token,
                    },
                });
                console.log(res);
                this.total = res.data.data.total;
                if (this.pageNum === 0) {
                    this.vulnerabilities = await res.data.data.codeDefectVOList.map((x: any) => new CheckResultTreeItem(x.id, x.fileName, x.defectType.name, '', 1, { filePath: x.filePath }, x.level.name,));
                } else {
                    const rest = await res.data.data.codeDefectVOList.map((x: any) => new CheckResultTreeItem(x.id, x.fileName, x.defectType.name, '', 1, { filePath: x.filePath }, x.level.name,));
                    await this.vulnerabilities.pop();
                    this.vulnerabilities = this.vulnerabilities.concat(rest);
                    vscode.window.showInformationMessage(`获取更多，当前${this.vulnerabilities.length}/${this.total}`);
                    if (this.vulnerabilities.length >= this.total || rest.length === 0) {
                        this.hasMore = false;
                        vscode.window.showInformationMessage('所有问题已获取完成！');
                    }
                }
            } else {
                // TODO：要干嘛来着
            }
        } catch (error) {
            console.error(error);
        }
        await vscode.commands.executeCommand('checkResult.focus');
    }

    // 获取树形结构的子节点
    async getChildren(element?: CheckResultTreeItem): Promise<CheckResultTreeItem[]> {
        // TODO：这小子在这儿做了很多事儿，需要回头研究一下
        if (!element) {
            // 根节点：返回最近的检测问题和 showMore 命令占位符
            await this.getVulnerability();
            if (this.hasMore) {
                this.vulnerabilities.push(showMorePlaceholder);
            }
            return Promise.resolve(this.vulnerabilities);
        } else if (element === showMorePlaceholder) {
            // showMore 命令占位符：返回空数组
            return Promise.resolve([]);
        } else {
            // 子节点：返回该次检测的详细信息
            const details = getHistoryDetails(element.id);
            return Promise.resolve(details);
        }
    }

    // 获取更多问题
    async showMore(): Promise<void> {
        if (!this.hasMore) { return; }
        this.pageNum++;
        this._onDidChangeTreeData.fire(undefined);
    }

    // 刷新树形结构
    async refresh(fileName: string = ''): Promise<void> {
        this._onDidChangeTreeData.fire(undefined);
        this.hasMore = true;
        this.pageNum = 0;
        this.fileName = fileName;
        await this.getVulnerability();
        vscode.window.showInformationMessage('刷新成功!');
    }
}

// 注册命令：显示检测问题的详细信息
export function registerShowDetailsCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('checkResult.showDetails', ({ label, description, filePosition }: CheckResultTreeItem) => {
            const { fileColumn, fileColumnEnd, fileLine, filePath } = filePosition;
            openFile(filePath, fileLine, fileColumn, fileColumnEnd);
            vscode.window.showInformationMessage(`${label}\n${description}`);
        })
    );
}
// 注册命令：显示更多问题
export function registerShowMoreCommand(context: vscode.ExtensionContext, provider: CheckResultTreeDataProvider) {
    context.subscriptions.push(
        vscode.commands.registerCommand('checkResult.showMore', async () => {
            try {
                await provider.showMore();
            } catch (error) {
                console.error(error);
            }
        })
    );
}


async function openFile(filePath: string, line: number, column: number = 0, columnEnd: number = 0) {
    const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
    const projectPath = config.get<string>('projectPath');
    if (projectPath) {
        const normalizedPath = path.join(projectPath, filePath);
        const uri = vscode.Uri.file(normalizedPath);
        const realLine = line - 1;
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            if (realLine >= 0) {
                const range = document.lineAt(realLine).range;
                const decoration = vscode.window.createTextEditorDecorationType({
                    backgroundColor: '#ff000030',
                    isWholeLine: true,
                });
                editor.setDecorations(decoration, [range]);
                editor.selection = new vscode.Selection(new vscode.Position(realLine, column), new vscode.Position(realLine, columnEnd));
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open ${normalizedPath}: ${error}`);
        }
    } else {
        vscode.window.showErrorMessage(`文件夹路径为空，请在设置配置文件中手动添加`);
    }
}



// 获取指定问题的详细信息
async function getHistoryDetails(defectId: string): Promise<CheckResultTreeItem[]> {
    try {
        const { serviceUrl, token } = getToken();
        const projectName = getProjectName();
        if (serviceUrl && token && projectName) {
            const encodedProjectName = encodeURIComponent(projectName);
            const res = await axios.get(`${serviceUrl}/cobot/api/project/${encodedProjectName}/defect/${defectId}`, {
                headers: {
                    'Authorization': token,
                }
            });
            const { id, path, desc, linNum } = res.data.data;
            const detail: any[] = res.data.data.trackList.map((x: any) => new CheckResultTreeItem(x.id, '缺陷跟踪: ' + x.filePath, x.descript, 'checkResult.showDetails', 0, { filePath: x.filePath, fileLine: x.line },));
            detail.unshift(new CheckResultTreeItem('detail' + id, path, desc, 'checkResult.showDetails', 0, { filePath: path, fileLine: linNum },));
            return detail;
        }
    } catch (error) {
        console.error(error);
    }
    return [];
}