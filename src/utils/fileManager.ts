import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedInterface, GeneratedAPI } from '../types/yapi';
import { ConfigManager } from './configManager';
import { DEFAULT_IMPORT_FUNCTION_NAMES } from '../constants';
import { getConfigTypeName } from '.';

export class FileManager {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  /**
   * 确保目录存在
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, dirPath);
    
    if (!fs.existsSync(fullPath)) {
      await fs.promises.mkdir(fullPath, { recursive: true });
    }
  }


  /**
   * 写入接口文件 interfaces.ts
   */
  async writeInterfacesFile(
    outputPath: string, 
    interfaces: GeneratedInterface[],
      menuName: string
  ): Promise<string> {
    const fileName = 'interfaces.ts';
    const fullPath = path.resolve(this.workspaceRoot, outputPath, fileName);
    
    let content = `//「${menuName}」自动生成的 TypeScript 接口定义\n`;
    content += `// 生成时间: ${new Date().toLocaleString()}\n`;
    content += `// 请不要手动修改此文件，每次生成都会覆盖！！！\n\n`;

    for (const interfaceItem of interfaces) {
      content += interfaceItem.content + '\n\n';
    }

    await this.formatAndWriteFile(fullPath, content);
    return fullPath;
  }

  /**
   * 写入 API 文件 apis.ts
   */
  async writeAPIsFile(
    outputPath: string, 
    apis: GeneratedAPI[],
    menuName: string
  ): Promise<string> {
    const fileName = 'apis.ts';
    const fullPath = path.resolve(this.workspaceRoot, outputPath, fileName);

    const config = ConfigManager.getConfig();
    const importFunctionNames = config.importFunctionNames || DEFAULT_IMPORT_FUNCTION_NAMES;

    
    let content = `//「${menuName}」自动生成的 API 请求函数\n`;
    content += `// 生成时间: ${new Date().toLocaleString()}\n`;
    content += `// 请不要手动修改此文件，每次生成都会覆盖！！！\n\n`;

    content += `import { ${importFunctionNames.join(', ')} } from '${config.requestFunctionFilePath}';\n\n`;
    
    content += `import { `;
    // 导入接口 - 修复：使用正确的接口名称格式
    const interfaceImports = apis.map(api => {
      // 从API名称中提取接口名称，去掉HTTP方法前缀
      let interfaceName = api.name;
      
      // 去掉HTTP方法前缀（get、post）
      const methodPrefixes = ['get', 'post'];
      for (const prefix of methodPrefixes) {
        if (interfaceName.toLowerCase().startsWith(prefix)) {
          interfaceName = interfaceName.slice(prefix.length);
          break;
        }
      }
      
      // 转换为PascalCase格式
      interfaceName = interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1);
      
      // 使用正确的接口名称格式：Params 和 Response
      return `${interfaceName}Params, ${interfaceName}Response`;
    }).join(', ');

    content += interfaceImports;
    content += ` } from './interfaces';\n\n`;

    importFunctionNames.forEach(functionName => {
      content += `type ${getConfigTypeName(functionName)} = Parameters<typeof ${functionName}>[2];\n\n`;
    });

    for (const api of apis) {
      if (typeof api.content !== 'string') {
        throw new Error('API generator returned non-string content. Did you return a Promise?');
      }
      content += api.content + '\n\n';
    }

    await this.formatAndWriteFile(fullPath, content);
    return fullPath;
  }

  /**
   * 写入索引文件 index.ts
   */
  async writeIndexFile(outputPath: string,menuName: string): Promise<string> {
    const fileName = 'index.ts';
    const fullPath = path.resolve(this.workspaceRoot, outputPath, fileName);
    
    let content = `//「${menuName}」API 模块导出文件\n`;
    content += `// 生成时间: ${new Date().toLocaleString()}\n`;
    content += `// 请不要手动修改此文件，每次生成都会覆盖！！！\n\n`;
    
    content += `export * from './interfaces';\n`;
    content += `export * from './apis';\n`;

    await this.formatAndWriteFile(fullPath, content);
    return fullPath;
  }

  /**
   * 使用项目内 Prettier 优先格式化并写入文件，不存在则回退 VSCode 格式化
   */
  async formatAndWriteFile(absPath: string, content: string): Promise<void> {
    let formatted: string = content;
    let usedPrettier = false;
    try {
      const prettier = await this.getPrettier(absPath);
      if (prettier) {
        const uri = vscode.Uri.file(absPath);
        const wsFolder = vscode.workspace.getWorkspaceFolder(uri);
        const baseDir = wsFolder?.uri.fsPath || this.workspaceRoot || path.dirname(absPath);
        const config = await prettier.resolveConfig(absPath, { editorconfig: true }).catch(() => undefined);
        // 尝试加载可选的 Prettier 插件以增强对 import 的组织能力
        const tryResolvePlugin = async (reqPath: string) => {
          try {
            const _require = eval('require');
            const mod = _require(reqPath);
            if (mod && typeof mod.then === 'function') {
              const awaited = await mod;
              return awaited?.default || awaited;
            }
            return mod?.default || mod;
          } catch {
            return null;
          }
        };
        const pluginCandidates = [
          path.resolve(baseDir, 'node_modules', 'prettier-plugin-organize-imports'),
          path.resolve(baseDir, 'node_modules', '@trivago/prettier-plugin-sort-imports'),
          'prettier-plugin-organize-imports',
          '@trivago/prettier-plugin-sort-imports'
        ];
        const resolvedPlugins: any[] = [];
        for (const cand of pluginCandidates) {
          const p = await tryResolvePlugin(cand);
          if (p) {
            resolvedPlugins.push(p);
          }
        }
        formatted = await prettier.format(content, {
          ...(config || {}),
          filepath: absPath,
          // @ts-ignore - Prettier v3 选项
          pluginSearchDirs: [baseDir],
          // 如果能解析到插件，则显式传入，确保在 Node API 下也能生效
          ...(resolvedPlugins.length > 0 ? { plugins: resolvedPlugins } : {})
        });
        usedPrettier = true;
      }
    } catch {
      usedPrettier = false;
    }

    await this.atomicWriteFile(absPath, formatted);

    if (!usedPrettier) {
      await this.formatFile(absPath);
    }
  }

  /**
   * 原子写入：先写入临时文件，再 rename 覆盖目标，避免并发或崩溃导致的部分内容丢失
   */
  async atomicWriteFile(absPath: string, content: string): Promise<void> {
    const dir = path.dirname(absPath);
    const base = path.basename(absPath);
    const tmp = path.resolve(dir, `.${base}.${Date.now()}.tmp`);
    try {
      await fs.promises.writeFile(tmp, content, 'utf8');
      await fs.promises.rename(tmp, absPath);
    } catch (err) {
      try {
        // 回退到直接写入
        await fs.promises.writeFile(absPath, content, 'utf8');
      } catch (e) {
        throw err;
      } finally {
        // 清理临时文件
        try { await fs.promises.unlink(tmp); } catch {}
      }
    }
  }

  /**
   * 优先加载工作区 node_modules 中的 prettier，不存在则尝试全局/打包内 prettier
   */
  private async getPrettier(absPath: string): Promise<any> {
    const tryResolve = async (reqPath: string) => {
      try {
        const _require = eval('require');
        const mod = _require(reqPath);
        // 如果是 Promise（ESM 动态导入场景），等待解析
        if (mod && typeof mod.then === 'function') {
          const awaited = await mod;
          return awaited?.default || awaited;
        }
        return mod?.default || mod;
      } catch {
        return null;
      }
    };

    try {
      const uri = vscode.Uri.file(absPath);
      const wsFolder = vscode.workspace.getWorkspaceFolder(uri);
      const baseDir = wsFolder?.uri.fsPath || this.workspaceRoot;
      if (baseDir) {
        const localPath = path.resolve(baseDir, 'node_modules', 'prettier');
        const local = await tryResolve(localPath);
        if (local) {
          return local;
        }
      }
      const global = await tryResolve('prettier');
      if (global) {
        return global;
      }
      // 最后尝试动态 import（ESM 环境）
      try {
        // @ts-ignore
        const esm = await import('prettier');
        return (esm as any)?.default || (esm as any);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 使用 VSCode 的格式化提供器格式化文件
   */
  async formatFile(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      const document = await vscode.workspace.openTextDocument(uri);
      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
        { insertSpaces: true, tabSize: 2 }
      );
      let didApply = false;
      if (edits && edits.length > 0) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, edits);
        await vscode.workspace.applyEdit(workspaceEdit);
        didApply = true;
        const ok = await document.save();
        if (!ok) {
          // 可能出现“文件内容较新”冲突：执行一次回退并重试保存
          await vscode.commands.executeCommand('workbench.action.files.revert');
          await vscode.workspace.applyEdit(workspaceEdit);
          await document.save();
        }
      } else {
        // 即使没有格式化 edits，也确保保存到磁盘，避免出现未保存状态
        if (document.isDirty) {
          const ok = await document.save();
          if (!ok) {
            await vscode.commands.executeCommand('workbench.action.files.revert');
            await document.save();
          }
        }
      }
    } catch (err) {
      console.warn('格式化失败:', err);
    }
  }

  /**
   * 打开生成的文件
   */
  async openFile(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    // 使用非预览模式打开，避免“预览”标签导致的未保存/易被替换问题
    await vscode.window.showTextDocument(document, { preview: false });
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath: string): boolean {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    return fs.existsSync(fullPath);
  }

  /**
   * 获取相对路径
   */
  getRelativePath(filePath: string): string {
    return path.relative(this.workspaceRoot, filePath);
  }
}
