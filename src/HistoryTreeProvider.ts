// 导入VSCode API
import * as vscode from 'vscode';

// 创建HistoryTreeDataProvider类
export class HistoryTreeDataProvider implements vscode.TreeDataProvider<HistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined> = new vscode.EventEmitter<HistoryItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined> = this._onDidChangeTreeData.event;

    // 获取树形结构的根节点
    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    // 获取树形结构的子节点
    getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
        if (!element) {
            // 根节点：返回最近的检测历史记录
            const history = getRecentHistory();
            return Promise.resolve(history);
        } else {
            // 子节点：返回该次检测的详细信息
            const details = getHistoryDetails(element.id);
            return Promise.resolve(details);
        }
    }

    // 刷新树形结构
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
        vscode.window.showInformationMessage('刷新成功!');
    }
}

// 创建HistoryItem类，用于表示每一次检测历史记录
class HistoryItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
    }

    // 点击节点时触发的事件
    command = {
        title: 'Show Details',
        command: 'history.showDetails',
        arguments: [this],
    };
}

// 注册命令：显示检测历史记录的详细信息
export function registerShowDetailsCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('history.showDetails', (item: HistoryItem) => {
            // TODO: 点击详情应该跳转到对应文件
            vscode.window.showInformationMessage(`${item.label}\n${item.description}`);
        })
    );
}

// 获取最近的检测历史记录
function getRecentHistory(): HistoryItem[] {
    // TODO: 获取最近的检测历史记录
    // TODO: 默认10条，类似git插件show more
    return [
        new HistoryItem('1', '2023-04-20 19:55:33', '1385个问题'),
        new HistoryItem('2', '2023-04-20 18:25:17', '1385个问题'),
        new HistoryItem('3', '2023-04-20 15:01:59', '1385个问题'),
        new HistoryItem('4', '2023-04-20 10:30:43', '1385个问题'),
        new HistoryItem('5', '2023-04-20 08:55:11', '0个问题'),
    ];
}

// 获取指定历史记录的详细信息
function getHistoryDetails(id: string): HistoryItem[] {
    // TODO: 获取指定历史记录的详细信息
    return [
        new HistoryItem(id + '1', 'CWE-122 堆缓冲区溢出', 'cwe122_2/s05/CWE122_Heap_Based_Buffer_Overflow__cpp_dest_wchar_t_cat_01.cpp  74行'),
        new HistoryItem(id + '2', 'CWE-121 栈缓冲区溢出', 'cwe121_2/s08/CWE121_Stack_Based_Buffer_Overflow__dest_char_alloca_cpy_63b.c  31行'),
        new HistoryItem(id + '3', 'CWE-404(cpp_checker)', 'cwe476/CWE476_NULL_Pointer_Dereference__char_82.h    25行'),
    ];
}