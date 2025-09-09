import * as vscode from 'vscode';
import { YAPIConfig } from '../types/yapi';
import { CONFIG_SECTION } from '../constants';
const fs = require('fs');
const path = require('path');
export class ConfigManager {
  private static readonly CONFIG_SECTION = CONFIG_SECTION;

  /**
   * 获取当前配置
   */
  static getConfig(): YAPIConfig {
    // 优化逻辑：优先读取工作区根目录下的 ytt.json 文件，如果不存在则回退到 VS Code 配置
    let configObj: any = {};
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const yttPath = path.join(rootPath, 'ytt.json');
        if (fs.existsSync(yttPath)) {
          const fileContent = fs.readFileSync(yttPath, 'utf-8');
          configObj = JSON.parse(fileContent);

          // 返回配置
          return configObj;
        }
      }
    } catch (err) {
      // 读取 ytt.json 失败时忽略，继续读取 VS Code 配置
      configObj = {};
    }
    // 如果 ytt.json 没有配置项， 
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    
    return {
      yapiUrl: config.get('yapiUrl', ''),
      username: config.get('username', ''),
      password: config.get('password', ''),
      // projectId: config.get('projectId', ''),
      requestFunctionFilePath: config.get('requestFunctionFilePath', ''),
      outputPath: config.get('outputPath', '')
    };
  }

  /**
   * 更新配置
   */
  static async updateConfig(config: Partial<YAPIConfig>): Promise<void> {
    const workspaceConfig = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    
    for (const [key, value] of Object.entries(config)) {
      await workspaceConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }

  /**
   * 验证配置是否完整
   */
  static validateConfig(config: YAPIConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.yapiUrl) {
      errors.push('YAPI 服务器地址不能为空');
    }

    if (!config.username) {
      errors.push('YAPI 用户名不能为空');
    }

    if (!config.password) {
      errors.push('YAPI 密码不能为空');
    }

    // if (!config.projectId) {
    //   errors.push('YAPI 项目 ID 不能为空');
    // }

    if (!config.outputPath) {
      errors.push('输出路径不能为空');
    }

    if (!config.requestFunctionFilePath) {
      errors.push('请求函数文件路径不能为空');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 显示配置对话框
   */
  // static async showConfigDialog(): Promise<YAPIConfig | undefined> {
  //   const currentConfig = this.getConfig();

  //   const yapiUrl = await vscode.window.showInputBox({
  //     prompt: '请输入 YAPI 服务器地址',
  //     value: currentConfig.yapiUrl,
  //     placeHolder: '例如: http://yapi.example.com'
  //   });

  //   if (!yapiUrl) return undefined;

  //   const username = await vscode.window.showInputBox({
  //     prompt: '请输入 YAPI 用户名',
  //     value: currentConfig.username,
  //     placeHolder: '您的 YAPI 账号用户名'
  //   });

  //   if (!username) return undefined;

  //   const password = await vscode.window.showInputBox({
  //     prompt: '请输入 YAPI 密码',
  //     value: currentConfig.password,
  //     password: true,
  //     placeHolder: '您的 YAPI 账号密码'
  //   });

  //   if (!password) return undefined;

  //   // const projectId = await vscode.window.showInputBox({
  //   //   prompt: '请输入 YAPI 项目 ID',
  //   //   value: currentConfig.projectId,
  //   //   placeHolder: '从 YAPI 项目 URL 中获取'
  //   // });

  //   // if (!projectId) return undefined;

  //   const requestFunctionFilePath = await vscode.window.showInputBox({
  //     prompt: '请输入请求函数文件路径',
  //     value: currentConfig.requestFunctionFilePath,
  //     placeHolder: '例如: ./src/api/request.ts'
  //   });

  //   if (!requestFunctionFilePath) return undefined;

  //   const outputPath = await vscode.window.showInputBox({
  //     prompt: '请输入输出路径',
  //     value: currentConfig.outputPath,
  //     placeHolder: '例如: ./src/api'
  //   });

  //   if (!outputPath) return undefined;

  //   const newConfig: YAPIConfig = {
  //     yapiUrl: yapiUrl.trim(),
  //     username: username.trim(),
  //     password: password.trim(),
  //     // projectId: projectId.trim(),
  //     outputPath: outputPath.trim(),
  //     requestFunctionFilePath: requestFunctionFilePath.trim()
  //   };

  //   // 验证配置
  //   const validation = this.validateConfig(newConfig);
  //   if (!validation.isValid) {
  //     vscode.window.showErrorMessage(`配置验证失败:\n${validation.errors.join('\n')}`);
  //     return undefined;
  //   }

  //   // 保存配置
  //   await this.updateConfig(newConfig);
  //   vscode.window.showInformationMessage('配置已保存');

  //   return newConfig;
  // }
}
