// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YAPIService } from './services/yapiService';
import { TerminalService } from './services/terminalService';
import { CodeGenerator } from './generators/codeGenerator';
import { FileManager } from './utils/fileManager';
import { ConfigManager } from './utils/configManager';
import { YAPIConfig } from './types/yapi';

export function activate(context: vscode.ExtensionContext) {
  console.log('YAPI TypeScript Generator 扩展已激活!');

  // 注册从 YAPI 生成 TypeScript 接口的命令
  // const generateCommand = vscode.commands.registerCommand('ytt.generateFromYAPI', async () => {
  //   try {
  //     await generateFromYAPI();
  //   } catch (error) {
  //     vscode.window.showErrorMessage(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  //   }
  // });

  // 注册配置 YAPI 设置的命令
  // const configureCommand = vscode.commands.registerCommand('ytt.configureYAPI', async () => {
  //   try {
  //     await ConfigManager.showConfigDialog();
  //   } catch (error) {
  //     vscode.window.showErrorMessage(`配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
  //   }
  // });

  // 注册启动终端工具的命令
  const terminalCommand = vscode.commands.registerCommand('ytt.startTerminal', async () => {
    try {
      const terminalService = new TerminalService();
      await terminalService.start();
      // 注意：TerminalService 会在完成后自动清理资源
    } catch (error) {
      vscode.window.showErrorMessage(`终端工具启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  context.subscriptions.push(terminalCommand);

  // context.subscriptions.push(generateCommand, configureCommand, terminalCommand);
}

/**
 * deactivate 用于 VSCode 扩展被卸载或禁用时的清理工作。
 * 目前未做任何处理，如有需要可在此释放资源、注销事件等。
 */
export function deactivate() {
  // 这里可以添加资源释放、事件注销等清理逻辑
  // console.log('YAPI TypeScript Generator 扩展已被停用。');
}

/**
 * 从 YAPI 生成 TypeScript 接口
 */
// async function generateFromYAPI(): Promise<void> {
//   console.log(`generateFromYAPI`);
//   // 获取配置
//   const config = ConfigManager.getConfig();
  
//   // 验证配置
//   const validation = ConfigManager.validateConfig(config);
//   if (!validation.isValid) {
//     const result = await vscode.window.showErrorMessage(
//       `配置不完整:\n${validation.errors.join('\n')}`,
//       '配置设置'
//     );
    
//     if (result === '配置设置') {
//       await vscode.commands.executeCommand('ytt.configureYAPI');
//     }
//     return;
//   }

//   // 显示进度
//   await vscode.window.withProgress({
//     location: vscode.ProgressLocation.Notification,
//     title: '正在从 YAPI 生成 TypeScript 接口...',
//     cancellable: false
//   }, async (progress) => {
//     try {
//       progress.report({ message: '正在连接 YAPI 服务器...' });

//       // 创建 YAPI 服务
//       const yapiService = new YAPIService(config);
      
//       // 获取所有接口
//       progress.report({ message: '正在获取接口列表...' });
//       const interfaces = await yapiService.getAllInterfaces();
      
//       if (interfaces.length === 0) {
//         vscode.window.showWarningMessage('未找到任何接口');
//         return;
//       }

//       progress.report({ message: '正在生成 TypeScript 代码...' });

//       // 创建代码生成器
//       const codeGenerator = new CodeGenerator();
//       const generatedInterfaces = codeGenerator.generateInterfaces(interfaces);
//       const generatedAPIs = codeGenerator.generateAPIs(interfaces);

//       progress.report({ message: '正在写入文件...' });

//       // 创建文件管理器
//       const fileManager = new FileManager();
      
//       // 确保输出目录存在
//       await fileManager.ensureDirectoryExists(config.outputPath);

//       // 写入文件
//       const interfacesPath = await fileManager.writeInterfacesFile(config.outputPath, generatedInterfaces);
//       const apisPath = await fileManager.writeAPIsFile(config.outputPath, generatedAPIs);
//       const indexPath = await fileManager.writeIndexFile(config.outputPath);

//       progress.report({ message: '生成完成!' });

//       // 显示成功消息
//       const result = await vscode.window.showInformationMessage(
//         `成功生成 ${interfaces.length} 个接口!\n` +
//         `接口文件: ${fileManager.getRelativePath(interfacesPath)}\n` +
//         `API 文件: ${fileManager.getRelativePath(apisPath)}\n` +
//         `索引文件: ${fileManager.getRelativePath(indexPath)}`,
//         '打开接口文件',
//         '打开 API 文件',
//         '打开索引文件'
//       );

//       // 根据用户选择打开文件
//       switch (result) {
//         case '打开接口文件':
//           await fileManager.openFile(interfacesPath);
//           break;
//         case '打开 API 文件':
//           await fileManager.openFile(apisPath);
//           break;
//         case '打开索引文件':
//           await fileManager.openFile(indexPath);
//           break;
//       }

//     } catch (error) {
//       throw error;
//     }
//   });
// }
