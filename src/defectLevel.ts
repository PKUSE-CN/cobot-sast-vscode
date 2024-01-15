/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
const levels = [
    { key: 1, value: "致命" },
    { key: 2, value: "严重" },
    { key: 3, value: "重要" },
    { key: 4, value: "次要" },
    { key: 5, value: "提示" },
    { key: 6, value: "强制" },
    { key: 7, value: "建议" },
];

const levelColor: Record<string, string> = {
    致命: "cobot.level.fatal",
    严重: "cobot.level.critical",
    重要: "cobot.level.important",
    次要: "cobot.level.minor",
    提示: "cobot.level.hint",
    强制: "cobot.level.required",
    建议: "cobot.level.suggestion",
};

export const getLevelColor = (level: string) => {
    return new vscode.ThemeColor(levelColor[level]);
};

const colorList = [
    "#701212",
    "#c53030",
    "#fc5d5d",
    "#ffaa33",
    "#d5c828",
    "#4a90e2",
    "#83d232",
];

const numberLevel = {
    1: "致命",
    2: "严重",
    3: "重要",
    4: "次要",
    5: "提示",
    6: "强制",
    7: "建议",
};

const numberColor = {
    1: "#701212",
    2: "#c53030",
    3: "#fc5d5d",
    4: "#ffaa33",
    5: "#d5c828",
    6: "#4a90e2",
    7: "#83d232",
};

export { levels, levelColor, colorList, numberLevel, numberColor };
