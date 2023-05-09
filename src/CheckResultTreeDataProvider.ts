// 导入VSCode API
import axios from 'axios';
import path = require('path');
import * as vscode from 'vscode';
interface FilePos {
    filePath: string,
    fileLine: number,
    fileColumn: number,
}

class CheckResultTreeItem extends vscode.TreeItem {
    filePosition: { filePath: string; fileLine: number; fileColumn: number; };
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string,
        public readonly commandName: string,
        public readonly collapsible?: vscode.TreeItemCollapsibleState,
        { filePath = '', fileLine = 0, fileColumn = 0 }: Partial<FilePos> = {}
    ) {
        super(label, collapsible);
        this.filePosition = {
            filePath,
            fileLine,
            fileColumn,
        };
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
    private pageNum = 1;
    private pageSize = 1000;
    private total = 0;


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
            const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
            const serverAddress = config.get<string>('address');
            const projectId = config.get<string>('projectId');
            if (serverAddress && projectId) {
                const res = await axios.get(`${serverAddress}/cobot/defect/listDefectByFilter?pageNum=${this.pageNum}&pageSize=${this.pageSize}&sortBy=asc&sortName=level&projectId=${projectId}&aboutMe=false`);
                console.log(this.pageNum);
                this.total = res.data.data.total;
                if (this.pageNum === 1) {
                    this.vulnerabilities = await res.data.data.codeDefectVOList.map((x: any) => new CheckResultTreeItem(x.id, x.fileName, x.defectType.name, '', 1, { filePath: x.filePath }));
                } else {
                    const rest = await res.data.data.codeDefectVOList.map((x: any) => new CheckResultTreeItem(x.id, x.fileName, x.defectType.name, '', 1, { filePath: x.filePath }));
                    await this.vulnerabilities.pop();
                    this.vulnerabilities = this.vulnerabilities.concat(rest);
                    vscode.window.showInformationMessage(`获取更多，当前${this.vulnerabilities.length}/${this.total}`);
                    if (this.vulnerabilities.length >= this.total || rest.length === 0) {
                        this.hasMore = false;
                        vscode.window.showInformationMessage('没有更多问题！');
                    }
                }
            } else {

            }

        } catch (error) {
            console.error(error);
        }
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
    async refresh(): Promise<void> {
        // TODO: 重新获取问题列表
        this._onDidChangeTreeData.fire(undefined);
        this.hasMore = true;
        this.pageNum = 1;
        await this.getVulnerability();
        vscode.window.showInformationMessage('刷新成功!');
    }
}

// 注册命令：显示检测问题的详细信息
export function registerShowDetailsCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('checkResult.showDetails', ({ label, description, filePosition }: CheckResultTreeItem) => {
            const { fileColumn, fileLine, filePath } = filePosition;
            openFile(filePath, fileLine, fileColumn);
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


async function openFile(filePath: string, line: number, column: number = 0) {
    const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
    const projectPath = config.get<string>('projectPath');
    if (projectPath) {
        const normalizedPath = projectPath.split('/').slice(0, -1).join('/') + '/' + filePath;
        const uri = vscode.Uri.file(normalizedPath);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            const range = document.lineAt(line - 1).range;
            const decoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'red',
                color: 'white'
            });
            editor.setDecorations(decoration, [range]);
            editor.selection = new vscode.Selection(new vscode.Position(line - 1, column), new vscode.Position(line - 1, column));
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
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
        const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
        const serverAddress = config.get<string>('address');
        const projectId = config.get<string>('projectId');
        if (serverAddress && projectId) {
            const res = await axios.get(`${serverAddress}/cobot/defect/getDetail?defectId=${defectId}&projectId=${projectId}`);
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