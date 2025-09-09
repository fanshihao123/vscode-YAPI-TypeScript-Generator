/**
 * 获取 Config TS类型
 * 如 import { xxx, yyy } from 'requestFunctionFilePath';
 * 返回 xxxConfig, yyyConfig 类型 
 * apis.ts 中使用 如 type xxxConfig = Parameters<typeof xxx>[2];
 */
export const getConfigTypeName = (functionName: string) => {
  return `${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Config`;
};