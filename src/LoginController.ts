import * as vscode from 'vscode';
import axios from 'axios';


interface ExtensionConfiguration {
    serverAddress: string | undefined;
    username: string | undefined;
    password: string | undefined;
}

export class LoginController {
    private _context: vscode.ExtensionContext;
    private _configuration: ExtensionConfiguration;

    constructor(context: vscode.ExtensionContext, configuration?: ExtensionConfiguration) {
        this._context = context;
        if (configuration) {
            this._configuration = configuration;
        } else {
            this._configuration = this.getConfig();
        }
    }
    /** 获取配置文件配置
     * @returns config实体和配置文件里的数据
     */
    getConfig() {
        const config = vscode.workspace.getConfiguration('cobot-sast-vscode');
        const serverAddress = config.get<string>('address');
        const username = config.get<string>('username');
        const password = config.get<string>('password');
        return { config, serverAddress, username, password };
    }

    /** 用于更新class内数据
     * @param notRefresh 是否重新获取数据
     * @returns config实体，用于update
     */
    refreshConfig(notRefresh: boolean = false) {
        const { config, ...otherConfig } = this.getConfig();
        this._configuration = notRefresh ? { password: '', serverAddress: '', username: '' } : otherConfig;
        return config;
    }

    async inputLogin(notRefresh: boolean = false) {
        const config = this.refreshConfig(notRefresh);
        if (!this._configuration.serverAddress) {
            let inputServerAddress = await vscode.window.showInputBox({
                prompt: '请输入后端服务地址',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value) {
                        return '服务地址不能为空';
                    }
                    return '';
                }
            });

            if (!inputServerAddress) {
                return;
            }

            const pattern = /^https?:\/\//i;
            if (!pattern.test(inputServerAddress)) {
                inputServerAddress = 'http://' + inputServerAddress;
            }
            const 地址 = new URL(inputServerAddress);

            await config.update('address', 地址.origin);
            this._configuration.serverAddress = 地址.origin;
        }

        if (!this._configuration.username || !this._configuration.password) {
            const inputUsername = await vscode.window.showInputBox({
                prompt: '请输入用户名',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value) {
                        return '用户名不能为空';
                    }
                    return '';
                }
            });

            if (!inputUsername) {
                return;
            }

            const inputPassword = await vscode.window.showInputBox({
                prompt: '请输入密码',
                ignoreFocusOut: true,
                password: true,
                validateInput: (value) => {
                    if (!value) {
                        return '密码不能为空';
                    }
                    return '';
                }
            });

            if (!inputPassword) {
                return;
            }

            await config.update('username', inputUsername);
            await config.update('password', inputPassword);
            this._configuration.username = inputUsername;
            this._configuration.password = inputPassword;
        }
    }

    async login(notRefresh: boolean = false) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            await this.inputLogin(notRefresh);
            // 发送登录请求
            try {
                const { serverAddress, password, username } = this._configuration;
                const res = await axios.post(`${serverAddress}/cobot/login`, { username, password });
                console.log(res);
                if (res.data.status === 0) {
                    vscode.window.showInformationMessage('库博静态代码分析工具连接成功');
                    axios.defaults.headers.common['Cookie'] = res.headers['set-cookie'];
                } else {
                    vscode.window.showErrorMessage('登录失败，请检查用户名密码是否正确，是否重新输入信息？', '是', '否').then(async (value) => {
                        if (value === '是') {
                            this.login(true);
                        }
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage('登录失败，请检查服务地址是否正确，是否重新输入信息？', '是', '否').then(async (value) => {
                    if (value === '是') {
                        this.login(true);
                    }
                });
            }
        } else {
            vscode.window.showErrorMessage('请先打开一个工作区，然后重试。');
        }
    }
}

export function loginCommand(context: vscode.ExtensionContext) {
    // 注册一个命令，用于用户点击登录按钮时触发
    context.subscriptions.push(
        vscode.commands.registerCommand('cobot-sast-vscode.login', async () => {
            const loginController = new LoginController(context);
            await loginController.login();
        })
    );
}