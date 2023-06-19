# 库博静态代码分析插件

## 介绍

* 这是一个基于[库博静态代码分析工具后端服务]进行开发的静态代码分析插件 beta 版，其主要功能是依赖后端服务进行单项目远端静态检测并获取、定位检测结果。它能够提供代码检测结果的定位和修复建议，帮助用户发现并解决代码中的潜在问题。使用该插件需要在后端服务中注册，并将登录信息填写到插件的配置中。

[库博静态代码分析工具后端服务]: http://192.168.1.43:50180/cobot-sast-buss/cobot-sast-web

## 快速启动

1. 安装部署 [库博静态代码分析工具后端服务] 并暴露 `ip` 、 `端口`（如果同时部署了 [库博静态代码分析工具前端服务] 配置了 `nginx` 也可以直接使用 `nginx` 暴露的地址）

2. 在 [Visual Studio 市场] 中安装或者手动 [下载]

3. 初次启动插件后右下角会弹出请配置 `Token` 和 `Url` 提示点击确定进入配置页面，也可通过通过按 (`Ctrl+,` 或者在Mac上 `Cmd+,`) 调出配置，搜索 `库博静态代码分析插件` 进入插件配置，然后在浏览器中访问[库博静态代码分析工具前端服务]地址，登录后按顺序依次找到`用户头像 > 账户信息 > 密钥 > 复制按钮`（如无密钥则点击`生成新密钥 > 复制`）复制的token粘贴到vscode配置中的`库博静态代码分析工具密钥`，之后填写`库博静态代码分析工具服务端地址`即可完成基础配置![配置token和url](/images/config-token.GIF)

4. 配置 `Token` 和 `Url` 后可以在 `资源管理器` 右键任意文件夹选择 `cobot: 检测项目`即可自动进入上传检测流程，检测完成后则自动跳转到检测结果![检测项目](/images/check-project.GIF)

5. 当检测完成后可在 `活动栏 > 库博静态代码分析工具 > 检测结果` 中找到检测结果，并通过点击检测结果定位到对应代码![检测结果](/images/check-result-command.GIF)

6. 检测完成后即可右键资源管理器中检测过的项目文件右键选择 `cobot: 筛选文件资源管理器结果` 筛选检测结果![文件筛选结果](/images/explorer-find-result.GIF)也可以通过点击打开的文件编辑器中右键选择 `cobot: 筛选当前编辑器文件结果` 获取检测结果![编辑器筛选结果](/images/editor-find-result.GIF)

[库博静态代码分析工具前端服务]: http://192.168.1.43:50180/cobot-sast-buss/cobot-fe

[Visual Studio 市场]: https://marketplace.visualstudio.com/items?itemName=PKUSE.cobot-sast-vscode

[下载]: https://github.com/PKUSE-CN/cobot-sast-vscode/releases

<!-- ## 配置

* 通过按 (`Ctrl+,` 或者在Mac上 `Cmd+,`) 调出配置，搜索 `库博静态代码分析插件` 进入插件配置
* [ ] 配置用户名密码token
* [ ] 检测路径配置？
* [ ] 可以给个配置的代码块 -->

## 发布日志

### 0.0.1

* 完成项目的搭建
* 实现了用户登录、项目上传、项目检测、项目结果展示定位等功能
* 编写了操作手册并制定了后续开发的任务计划

### 0.0.2

* 检测结果增加了图标，现在可以通过图标颜色确认严重等级了
* 增加了按文件筛选检测结果的方法，现在可以通过右键某文件或者右键打开的编辑器窗口来筛选检测结果了
* 修复了一些显示问题

### 0.0.3

* 修改config为存储在工作空间配置，防止更换电脑后mac和windows的路径问题(如果进行了工作空间文件夹配置，则优先使用工作空间文件夹配置)，现在必须在使用插件前打开一个文件夹或者将文件夹添加到工作区了
* 上传项目时增加了选择当前工作空间项目的选项
* 上传项目时增加了上传文件夹进度，现在可以看到上传的文件夹进度了
* 增加了配置设置 `cobot-sast-vscode.projectName` 即当前项目名，现在上传项目时会在输入项目名后自动存储项目名
* 增加了检测时自动匹配项目名的功能，现在会自动匹配配置文件中的项目名称即 `cobot-sast-vscode.projectName` 进行初步搜索了

<!-- ## 操作

* 通过按 (`Ctrl+Shift+P` 或者在Mac上 `Cmd+Shift+P`) 调出控制台
* [ ] 执行 `xxx` 命令
* [ ] 配点儿录制的动图 \!\[示例图\]\(images/logo-cobot.png\) -->

### 1.0.0

* 项目重构
* 更换token校验方式，现在再也不需要登录了
* 接口更换为openAPI接口，现在流程里不再需要projectId来定位获取项目信息了
* 项目上传修改为文件夹右键上传，会先压缩文件夹到缓存中再上传，压缩完成后会自动清除缓存中的压缩包
* 上传逻辑为先检查项目状态
  * 如果`返回检测状态`则进行判断
    * 如果 `0未检测`、`4检测中断` 则提示是否重新上传
      * 重新上传则$\color{orange} {调用更新代码接口} $
        * 然后afterUpload
      * 不重新上传则直接afterUpload
    * 如果 `1检测中`、`3等待中`、`5队列中`、`6进队列中` 则**递归**$\color{violet} {调用检测状态接口} $（目前接口缺失检测状态只能在那儿瞎等）
    * 如果 `2已完成` 则**提示是否重新上传**
      * 重新上传则$\color{orange} {调用更新代码接口} $
        * 然后afterUpload
      * 不重新上传则$\color{green} {调用检测结果接口} $
  * 如果`项目不存在`则
    * $\color{red} {调用上传接口} $
      * 然后afterUpload
* 上传完成后进行直接进行检测`afterUpLoad`
  * 上传完成后$\color{blue} {调用开始检测接口} $
  * 之后**循环**$\color{violet} {调用检测状态接口} $
  * 检测完成后$\color{green} {调用检测结果接口} $
* 检测结果修改为默认获取10k条，正常情况无需犯法加载更多，可以通过按(`Ctrl+F` 或者在Mac上 `Cmd+F`)初步筛选检测结果了
* 修改了readme.md中的操作步骤并重新录制了操作流程

### 1.0.1

* 解决fs.ReadStream操作冲突导致在MacOS 13.4下无法正确上传文件的问题

## 后续可能计划

* [ ] 选择文件夹上传后会自动将选择的文件夹添加到工作空间
* 提示检测项目是检测当前文件夹还是工作空间路径
  * [ ] 文件为当前路径和工作空间路径（最好能显示名称）
  * [ ] 工作空间可以查看是否能只工作空间路径（如果不能的话就提示当前工作空间xxx和当前文件夹xxx）
  * [ ] 当前配置Id为默认配置后端写死，后续修改不能直接获取其他Id需要增加配置接口
* [ ] 按文件夹筛选检测结果
* [ ] 与后端配合显示检测进度
* [ ] Axios拦截器处理Token过期情况
* [ ] 如果一上来所有结果列表都获取了则不显示获取更多了
* [ ] 在检测结果部分显示total
* [ ] 补充检测配置信息回显
* [ ] 补充项目详情回显
* [ ] 服务端存在上传项目无法进队列的问题
* [ ] 服务端需要提供检测进度
* [ ] url配置正则校验
* [ ] 1.1.0补充自定义检测配置项

## 许可证

该插件在[GNU GENERAL PUBLIC v3.0](/LICENSE)许可下发布。

## 联系方式

* 如果遇到问题请联系[陈静](mailto:chenjing@beidasoft.com)

**尽情享用吧!**
