import * as vscode from 'vscode';
import * as path from 'path';
import * as archiver from 'archiver';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { formatSize, getFolderSize } from './Utils';

/**
 * 将文件夹压缩到缓存中
 * @param folderPath 要压缩的文件夹路径
 * @param folderName 要压缩的文件夹名称
 * @returns 压缩包的Buffer
 */
export const compressFolderInTemp = async (folderPath: string): Promise<fs.ReadStream> => {
    return new Promise((resolve, reject) => {
        try {
            const nextLevelFolderPath = path.join(folderPath, path.sep);
            const archive = archiver('zip', { zlib: { level: 9 } });
            const total = getFolderSize(folderPath)

            tmp.file((err: any, tmpFilePath: any, fd: any, cleanupCallback: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                const output = fs.createWriteStream(tmpFilePath);
                let processedBytes = 0; // 用于保存已处理的文件数量

                archive.on('progress', (progress) => {
                    // 更新已处理的文件数量
                    processedBytes = progress.fs.processedBytes;
                });

                output.on('finish', () => {
                    const buffer = fs.readFileSync(tmpFilePath);
                    const fileStream = fs.createReadStream(tmpFilePath);
                    console.log(tmpFilePath);
                    console.log(`压缩后大小：${formatSize(buffer.length)}`);
                    resolve(fileStream);
                    cleanupCallback();
                    console.log('临时压缩包已被清理');
                });

                output.on('end', () => {
                    console.log('Data has been drained');
                    cleanupCallback();
                    console.log('临时压缩包已被清理');
                });

                output.on('error', (error: any) => {
                    console.error(error);
                    reject(error);
                    cleanupCallback();
                    console.log('临时压缩包已被清理');
                });

                archive.on('error', (error) => {
                    console.error(error);
                    reject(error);
                });

                archive.pipe(output);
                archive.directory(nextLevelFolderPath, false);
                archive.finalize();
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: '文件压缩中',
                    cancellable: false
                }, (progress) => {
                    return new Promise<void>((resolve) => {
                        let previousLoaded = 0; // 用于保存上一次进度事件的 loaded 值
                        const timer = setInterval(() => {
                            const increment = processedBytes - previousLoaded; // 计算增量
                            const incrementComplete = (increment * 100) / total;
                            progress.report({ increment: incrementComplete, message: `${formatSize(processedBytes)}/${formatSize(total)}` });
                            if (processedBytes >= total) {
                                clearInterval(timer);
                                resolve();
                            }
                            previousLoaded = processedBytes;
                        }, 100);
                    });
                });
            });
        } catch (error) {
            console.error(error);
            reject(error);

        }
    });
};