# 库博静态代码分析插件

## 介绍

* 这是一个基于[库博静态代码分析工具后端服务]进行开发的静态代码分析插件 beta 版，其主要功能是依赖后端服务进行单项目远端静态检测并获取、定位检测结果。它能够提供代码检测结果的定位和修复建议，帮助用户发现并解决代码中的潜在问题。使用该插件需要在后端服务中注册，并将登录信息填写到插件的配置中。

[库博静态代码分析工具后端服务]: http://192.168.1.43:50180/cobot-sast-buss/cobot-sast-web

## 快速启动

1. 安装部署 [库博静态代码分析工具后端服务] 并暴露 `ip` 、 `端口`（如果同时部署了 [库博静态代码分析工具前端服务] 配置了 `nginx` 也可以直接使用 `nginx` 暴露的地址）
2. 在 [Visual Studio 市场] 中安装或者手动 [下载]
3. 初次启动插件后右下角会弹出登录提示，也可通过通过按 (`Ctrl+Shift+P` 或者在Mac上 `Cmd+Shift+P`) 调出控制台调用 `cobot-sast-vscode.login` 或 `库博静态代码分析工具:登录`命令进行登录，登录成功后右下角会弹出登录成功提示![登录](/images/login-command.GIF)
4. 保存登录信息后可以通过按(`Ctrl+Shift+P` 或者在Mac上 `Cmd+Shift+P`) 调出控制台调用 `cobot-sast-vscode.uploadProject` 或 `库博静态代码分析工具:上传项目`命令进行项目的上传，同时需要给出项目名称，上传成功后会在右下角提示上传成功![上传](/images/upload-command.GIF)
5. 上传项目后可通过通过按(`Ctrl+Shift+P` 或者在Mac上 `Cmd+Shift+P`) 调出控制台调用 `cobot-sast-vscode.checkProject` 或 `库博静态代码分析工具:检测项目`命令进行项目的检测，输入之前上传时输入的项目名称，检测完成后即可获取检测结果![检测](/images/check-command.GIF)
6. 当检测完成后可在 `活动栏 > 库博静态代码分析工具 > 检测结果` 中找到检测结果，并通过点击检测结果定位到对应代码![检测结果](/images/check-result-command.GIF)

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

<!-- ## 操作

* 通过按 (`Ctrl+Shift+P` 或者在Mac上 `Cmd+Shift+P`) 调出控制台
* [ ] 执行 `xxx` 命令
* [ ] 配点儿录制的动图 \!\[示例图\]\(images/logo-cobot.png\) -->

## 许可证

该插件在[GNU GENERAL PUBLIC v3.0](/LICENSE)许可下发布。

## 联系方式

* 如果遇到问题请联系[陈静](mailto:chenjing@beidasoft.com)

**尽情享用吧!**
