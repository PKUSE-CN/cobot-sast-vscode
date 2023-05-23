import * as path from 'path';
import * as fs from 'fs';

/**
 * 获取文件夹下所有文件
 * @param folderPath 文件夹路径
 * @returns 文件夹下所有路径的字符串数组
 */
export const getFilesInFolder = async (folderPath: string): Promise<string[]> => {
    const files = await fs.promises.readdir(folderPath);
    const result: string[] = [];

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory()) {
            // 如果是文件夹，则递归获取文件夹下的文件
            const subFiles = await getFilesInFolder(filePath);
            result.push(...subFiles);
        } else {
            // 如果是文件，则将文件路径添加到结果数组中
            result.push(filePath);
        }
    }
    return result;
};

/**
 * 字节存储单位转换
 * @param bytes 原始字节长度
 * @returns 格式化后的字节字符串
 */
export const formatSize = (bytes: number): string => {
    if (bytes >= 1e9) {
        return (bytes / 1e9).toFixed(2) + ' GB';
    } else if (bytes >= 1e6) {
        return (bytes / 1e6).toFixed(2) + ' MB';
    } else if (bytes >= 1e3) {
        return (bytes / 1e3).toFixed(2) + ' KB';
    } else {
        return bytes + ' bytes';
    }
};

/**
 * 计算文件夹的大小（递归）
 * @param folderPath 文件夹路径
 * @returns 文件夹的大小（以字节为单位）
 */
export const getFolderSize = (folderPath: string): number => {
    let totalSize = 0;

    const calculateSize = (currentPath: string): void => {
        const stat = fs.statSync(currentPath);
        if (stat.isFile()) {
            totalSize += stat.size;
        } else if (stat.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            files.forEach((file) => {
                const filePath = path.join(currentPath, file);
                calculateSize(filePath);
            });
        }
    };

    calculateSize(folderPath);
    return totalSize;
};

/**
 * 处理Url用与请求
 * @param serviceUrl 配置中拿到的Url
 * @returns 处理过的Url
 */
export const processUrl = (serviceUrl: string): string => {
    // 判断 serviceUrl 是否包含协议和端口号
    if (/^(https?:\/\/)/.test(serviceUrl)) {
        return serviceUrl.replace(/\/$/, '');
    } else {
        return `http://${serviceUrl.replace(/\/$/, '')}`;
    }
};


export const getCheckStatusName = (status?: number) => {
    const name = [
        '未检测',
        '检测中',
        '已完成',
        '等待中',
        '检测中断',
        '队列中',
        '进队列中',
    ];

    if (status && status >= 0 && status < name.length) {
        return name[status];
    } else {
        return '状态未知';
    }
};
