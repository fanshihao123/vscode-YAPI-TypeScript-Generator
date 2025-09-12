import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedInterface, GeneratedAPI } from '../types/yapi';
import { ConfigManager } from './configManager';
import { DEFAULT_IMPORT_FUNCTION_NAMES } from '../constants';
import { getConfigTypeName } from '.';

export class FileManager {
  private workspaceRoot: string;
  private fileLocks: Map<string, Promise<void>> = new Map();

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
   * 带文件锁机制，防止并发写入
   */
  async formatAndWriteFile(absPath: string, content: string): Promise<void> {
    // 检查是否有正在进行的写入操作
    const existingLock = this.fileLocks.get(absPath);
    if (existingLock) {
      // 等待现有操作完成
      await existingLock;
    }

    // 创建新的锁
    const writePromise = this.performFormatAndWrite(absPath, content);
    this.fileLocks.set(absPath, writePromise);

    try {
      await writePromise;
    } finally {
      // 清理锁
      this.fileLocks.delete(absPath);
    }
  }

  /**
   * 执行实际的格式化和写入操作
   */
  private async performFormatAndWrite(absPath: string, content: string): Promise<void> {
    // 1. 预处理：确保文件状态干净
    await this.prepareFileForWrite(absPath);
    
    // 2. 写入文件
    await this.atomicWriteFile(absPath, content);
    
    // 3. 强制刷新 VSCode 文件系统状态
    await this.forceRefreshFileSystem(absPath);
    
    // 4. 确保文件在 VSCode 中打开和识别
    await this.ensureFileOpened(absPath);
    
    // 5. 执行 ESLint 修复
    await this.runESLintFix(absPath);
    
    // 6. 执行 Prettier 格式化（避免多次写入）
    await this.runPrettierFormatWithoutWrite(absPath);
    
    // 7. 确保文件在 VSCode 中保存（只保存一次）
    await this.ensureFileSavedOnce(absPath);
  }

  /**
   * 预处理：确保文件状态干净
   */
  private async prepareFileForWrite(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 检查并保存已打开的文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          // 如果文档是脏的，先保存
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 强制保存所有文件
      try {
        await vscode.commands.executeCommand('workbench.action.files.saveAll');
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 刷新文件系统
      try {
        await vscode.commands.executeCommand('workbench.action.files.refresh');
        // 等待刷新完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法4: 强制关闭可能冲突的文档
      try {
        await this.forceCloseConflictingDocuments(absPath);
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 强制关闭可能冲突的文档
   */
  private async forceCloseConflictingDocuments(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 尝试关闭当前文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          // 如果文档是脏的，先保存再关闭
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 使用 VSCode 命令关闭文档
      try {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        // 等待关闭完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 强制刷新文件系统
      try {
        await vscode.commands.executeCommand('workbench.action.files.refresh');
        // 等待刷新完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 强制刷新 VSCode 文件系统状态
   */
  private async forceRefreshFileSystem(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 强制重新加载文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        // 等待文档加载完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 强制刷新工作区
      try {
        await vscode.commands.executeCommand('workbench.action.files.refresh');
        // 等待刷新完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 触发文件系统事件
      try {
        // 通过重新打开文档来触发文件系统事件
        await vscode.workspace.openTextDocument(uri);
        // 等待文件系统事件处理完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 确保文件在 VSCode 中打开和识别
   */
  private async ensureFileOpened(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 打开文档，确保 VSCode 识别文件状态
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        // 等待文档加载完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 使用 VSCode 命令打开文件
      try {
        await vscode.commands.executeCommand('vscode.open', uri);
        // 等待文件打开完成
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 触发文件系统事件
      try {
        await vscode.commands.executeCommand('workbench.action.files.refresh');
        // 等待文件系统刷新完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 最终验证和强制格式化
   */
  private async finalFormatVerification(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 强制使用 VSCode 格式化命令
      try {
        await vscode.commands.executeCommand('editor.action.formatDocument', uri);
        // 等待格式化完成
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 强制保存文件并处理冲突
      try {
        await this.forceSaveWithConflictResolution(absPath);
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 最终检查文档状态
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          // 如果文档仍然是脏的，尝试最后一次保存
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 执行 ESLint 修复
   */
  private async runESLintFix(absPath: string): Promise<void> {
    try {
      // 检查是否是 TypeScript/JavaScript 文件
      const ext = path.extname(absPath).toLowerCase();
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return;
      }

      // 检查 ESLint 配置是否存在
      if (!await this.hasESLintConfig(absPath)) {
        console.log(`ℹ️ 未找到 ESLint 配置，跳过 ESLint 修复: ${path.basename(absPath)}`);
        return;
      }

      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 使用 ESLint 扩展的修复命令
      try {
        await vscode.commands.executeCommand('eslint.executeAutofix', uri);
        // console.log(`✅ ESLint 自动修复完成: ${path.basename(absPath)}`);
        return;
      } catch (error) {
        console.log(`ℹ️ ESLint 扩展命令不可用，尝试其他方法: ${path.basename(absPath)}`);
      }

      // 方法2: 使用工作区命令
      try {
        await vscode.commands.executeCommand('eslint.executeAutofix');
        console.log(`✅ ESLint 工作区修复完成: ${path.basename(absPath)}`);
        return;
      } catch (error) {
        console.log(`ℹ️ ESLint 工作区命令不可用: ${path.basename(absPath)}`);
      }

      // 方法3: 使用代码操作
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
          'vscode.executeCodeActionProvider',
          uri,
          new vscode.Range(0, 0, document.lineCount, 0)
        );
        
        if (codeActions && codeActions.length > 0) {
          const eslintActions = codeActions.filter(action => 
            action.title.includes('ESLint') || 
            action.title.includes('Fix') ||
            action.kind === vscode.CodeActionKind.SourceFixAll
          );
          
          if (eslintActions.length > 0) {
            const workspaceEdit = new vscode.WorkspaceEdit();
            eslintActions.forEach(action => {
              if (action.edit) {
                action.edit.entries().forEach(([uri, edits]) => {
                  workspaceEdit.set(uri, edits);
                });
              }
            });
            
            if (workspaceEdit.size > 0) {
              await vscode.workspace.applyEdit(workspaceEdit);
              console.log(`✅ ESLint 代码操作修复完成: ${path.basename(absPath)}`);
            }
          }
        }
      } catch (error) {
        console.log(`ℹ️ ESLint 代码操作不可用: ${path.basename(absPath)}`);
      }

    } catch (error) {
      console.warn(`⚠️ ESLint 修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查是否存在 ESLint 配置
   */
  private async hasESLintConfig(filePath: string): Promise<boolean> {
    try {
      const dir = path.dirname(filePath);
      const configFiles = [
        '.eslintrc',
        '.eslintrc.js',
        '.eslintrc.json',
        '.eslintrc.yaml',
        '.eslintrc.yml',
        'eslint.config.js',
        'eslint.config.mjs'
      ];

      // 检查当前目录和父目录
      let currentDir = dir;
      while (currentDir !== path.dirname(currentDir)) {
        for (const configFile of configFiles) {
          const configPath = path.join(currentDir, configFile);
          try {
            await fs.promises.access(configPath);
            return true;
          } catch {
            // 文件不存在，继续检查
          }
        }
        currentDir = path.dirname(currentDir);
      }

      // 检查 package.json 中的 eslintConfig
      const packageJsonPath = path.join(dir, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
        if (packageJson.eslintConfig) {
          return true;
        }
      } catch {
        // package.json 不存在或解析失败
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 执行 Prettier 格式化
   */
  private async runPrettierFormat(absPath: string): Promise<void> {
    let usedPrettier = false;
    
    // 首先尝试使用 Prettier 格式化
    try {
      const prettier = await this.getPrettier(absPath);
      if (prettier) {
        const uri = vscode.Uri.file(absPath);
        const wsFolder = vscode.workspace.getWorkspaceFolder(uri);
        const baseDir = wsFolder?.uri.fsPath || this.workspaceRoot || path.dirname(absPath);
        
        // 获取 Prettier 配置，如果没有则使用默认配置
        const config = await prettier.resolveConfig(absPath, { editorconfig: true }).catch(() => undefined);
        const defaultConfig = {
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'es5',
          printWidth: 100,
          endOfLine: 'lf'
        };
        
        // 尝试加载可选的 Prettier 插件
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
        
        // 读取当前文件内容
        const currentContent = await fs.promises.readFile(absPath, 'utf8');
        
        const formatted = await prettier.format(currentContent, {
          ...defaultConfig,
          ...(config || {}),
          filepath: absPath,
          // @ts-ignore - Prettier v3 选项
          pluginSearchDirs: [baseDir],
          // 如果能解析到插件，则显式传入，确保在 Node API 下也能生效
          ...(resolvedPlugins.length > 0 ? { plugins: resolvedPlugins } : {})
        });
        
        // 如果内容有变化，写入格式化后的内容
        if (formatted !== currentContent) {
          await this.atomicWriteFile(absPath, formatted);
          // console.log(`✅ Prettier 格式化完成: ${path.basename(absPath)}`);
        } else {
          // console.log(`ℹ️ Prettier 格式化无变化: ${path.basename(absPath)}`);
        }
        
        usedPrettier = true;
      }
    } catch (error) {
      console.warn(`⚠️ Prettier 格式化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      usedPrettier = false;
    }

    // 如果 Prettier 不可用，使用 VSCode 内置格式化器
    if (!usedPrettier) {
      console.log(`⚠️ Prettier 不可用，使用 VSCode 内置格式化器: ${path.basename(absPath)}`);
      await this.formatFile(absPath);
    }
  }

  /**
   * 执行 Prettier 格式化（避免多次写入）
   */
  private async runPrettierFormatWithoutWrite(absPath: string): Promise<void> {
    let usedPrettier = false;
    
    // 首先尝试使用 Prettier 格式化
    try {
      const prettier = await this.getPrettier(absPath);
      if (prettier) {
        const uri = vscode.Uri.file(absPath);
        const wsFolder = vscode.workspace.getWorkspaceFolder(uri);
        const baseDir = wsFolder?.uri.fsPath || this.workspaceRoot || path.dirname(absPath);
        
        // 获取 Prettier 配置，如果没有则使用默认配置
        const config = await prettier.resolveConfig(absPath, { editorconfig: true }).catch(() => undefined);
        const defaultConfig = {
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'es5',
          printWidth: 100,
          endOfLine: 'lf'
        };
        
        // 尝试加载可选的 Prettier 插件
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
        
        // 读取当前文件内容
        const currentContent = await fs.promises.readFile(absPath, 'utf8');
        
        const formatted = await prettier.format(currentContent, {
          ...defaultConfig,
          ...(config || {}),
          filepath: absPath,
          // @ts-ignore - Prettier v3 选项
          pluginSearchDirs: [baseDir],
          // 如果能解析到插件，则显式传入，确保在 Node API 下也能生效
          ...(resolvedPlugins.length > 0 ? { plugins: resolvedPlugins } : {})
        });
        
        // 如果内容有变化，使用 VSCode 格式化而不是写入文件
        if (formatted !== currentContent) {
          // 使用 VSCode 的格式化提供器格式化文件
          await this.formatFile(absPath);
          // console.log(`✅ Prettier 格式化完成: ${path.basename(absPath)}`);
        } else {
          console.log(`ℹ️ Prettier 格式化无变化: ${path.basename(absPath)}`);
        }
        
        usedPrettier = true;
      }
    } catch (error) {
      console.warn(`⚠️ Prettier 格式化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      usedPrettier = false;
    }

    // 如果 Prettier 不可用，使用 VSCode 内置格式化器
    if (!usedPrettier) {
      console.log(`⚠️ Prettier 不可用，使用 VSCode 内置格式化器: ${path.basename(absPath)}`);
      await this.formatFile(absPath);
    }
  }

  /**
   * 确保文件在 VSCode 中保存
   */
  async ensureFileSaved(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 尝试直接保存文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // 如果直接保存失败，尝试其他方法
        console.warn('直接保存失败，尝试其他方法:', error);
      }
      
      // 方法2: 使用 VSCode 保存命令
      try {
        await vscode.commands.executeCommand('workbench.action.files.save');
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 强制保存并处理冲突
      try {
        await this.forceSaveWithConflictResolution(absPath);
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      console.warn('确保文件保存失败:', error);
    }
  }

  /**
   * 确保文件在 VSCode 中保存（只保存一次）
   */
  async ensureFileSavedOnce(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 尝试直接保存文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // 如果直接保存失败，尝试其他方法
        console.warn('直接保存失败，尝试其他方法:', error);
      }
      
      // 方法2: 使用 VSCode 保存命令
      try {
        await vscode.commands.executeCommand('workbench.action.files.save');
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      console.warn('确保文件保存失败:', error);
    }
  }

  /**
   * 强制保存并处理冲突
   */
  private async forceSaveWithConflictResolution(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 重新加载文档并保存
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        // 如果文档是脏的，尝试保存
        if (document.isDirty) {
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 使用 VSCode 的保存命令
      try {
        await vscode.commands.executeCommand('workbench.action.files.save');
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法3: 强制保存所有文件
      try {
        await vscode.commands.executeCommand('workbench.action.files.saveAll');
        // 等待保存完成
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法4: 如果仍然有冲突，强制覆盖保存
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
          // 强制保存，忽略冲突
          await document.save();
          // 等待保存完成
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法5: 最终强制覆盖 - 直接写入文件系统
      try {
        await this.forceOverwriteFile(absPath);
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
    }
  }

  /**
   * 最终强制覆盖 - 直接写入文件系统
   */
  private async forceOverwriteFile(absPath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(absPath);
      
      // 方法1: 获取文档内容并强制写入
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        const content = document.getText();
        
        // 直接写入文件系统，绕过 VSCode 的冲突检查
        await fs.promises.writeFile(absPath, content, 'utf8');
        
        // 等待写入完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 强制刷新 VSCode 文件系统
        await vscode.commands.executeCommand('workbench.action.files.refresh');
        
        // 等待刷新完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        // 忽略错误，继续执行
      }
      
      // 方法2: 强制重新加载文档
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        // 等待文档重新加载
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 忽略错误，继续执行
      }
      
    } catch (error) {
      // 忽略所有错误，确保流程继续
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
      // 方法1: 尝试原子写入
      await fs.promises.writeFile(tmp, content, 'utf8');
      await fs.promises.rename(tmp, absPath);
      
      // 等待写入完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      // 清理临时文件
      try {
        await fs.promises.unlink(tmp);
      } catch {
        // 忽略清理错误
      }
      
      // 方法2: 如果原子写入失败，尝试直接覆盖
      try {
        await fs.promises.writeFile(absPath, content, 'utf8');
        // 等待写入完成
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (directErr) {
        // 如果直接写入也失败，抛出原始错误
        throw err;
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
   * 增强对"文件内容较新"错误的处理
   */
  async formatFile(absPath: string): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
    try {
      const uri = vscode.Uri.file(absPath);
        
        // 确保文件在 VSCode 中打开和识别
      const document = await vscode.workspace.openTextDocument(uri);
        
        // 等待文档加载完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 检查文档是否是最新的
        if (document.isDirty) {
          // 如果文档是脏的，先保存
          try {
            const saveResult = await document.save();
            if (!saveResult) {
              // 保存失败，可能是"文件内容较新"错误
              if (retryCount < maxRetries - 1) {
                retryCount++;
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                continue;
              }
            }
          } catch (error) {
            // 保存失败，可能是"文件内容较新"错误
            if (retryCount < maxRetries - 1) {
              retryCount++;
              // 等待一段时间后重试
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
              continue;
            }
          }
        }
        
        // 强制刷新文件系统状态
        try {
          await vscode.commands.executeCommand('workbench.action.files.refresh');
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // 忽略错误，继续执行
        }
        
        // 强制重新加载文档
        try {
          const freshDocument = await vscode.workspace.openTextDocument(uri);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // 忽略错误，继续执行
        }
        
        // 尝试多种格式化方法
        let formatted = false;
        
        // 方法1: 使用 executeFormatDocumentProvider
        try {
      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
            { 
              insertSpaces: true, 
              tabSize: 2,
              trimAutoWhitespace: true
            }
          );
          
      if (edits && edits.length > 0) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, edits);
            const applyResult = await vscode.workspace.applyEdit(workspaceEdit);
            
            if (applyResult) {
              formatted = true;
              console.log(`✅ 使用 executeFormatDocumentProvider 格式化: ${path.basename(absPath)}`);
            }
          }
        } catch (error) {
          console.warn(`executeFormatDocumentProvider 失败:`, error);
        }
        
        // 方法2: 使用 editor.action.formatDocument 命令
        if (!formatted) {
          try {
            await vscode.commands.executeCommand('editor.action.formatDocument', uri);
            formatted = true;
            // console.log(`✅ 使用 editor.action.formatDocument 格式化: ${path.basename(absPath)}`);
          } catch (error) {
            console.warn(`editor.action.formatDocument 失败:`, error);
          }
        }
        
        // 方法3: 使用 TypeScript 格式化器
        if (!formatted) {
          try {
            const tsEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
              'vscode.executeFormatDocumentProvider',
              uri,
              { 
                insertSpaces: true, 
                tabSize: 2,
                trimAutoWhitespace: true
              }
            );
            
            if (tsEdits && tsEdits.length > 0) {
              const workspaceEdit = new vscode.WorkspaceEdit();
              workspaceEdit.set(uri, tsEdits);
        await vscode.workspace.applyEdit(workspaceEdit);
              formatted = true;
              console.log(`✅ 使用 TypeScript 格式化器: ${path.basename(absPath)}`);
            }
          } catch (error) {
            console.warn(`TypeScript 格式化器失败:`, error);
          }
        }
        
        // 方法4: 使用内置简单格式化器作为最后回退
        if (!formatted) {
          try {
            const content = document.getText();
            const formattedContent = this.simpleFormat(content);
            if (formattedContent !== content) {
              const edit = new vscode.WorkspaceEdit();
              const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
              );
              edit.replace(uri, fullRange, formattedContent);
              await vscode.workspace.applyEdit(edit);
              formatted = true;
              console.log(`✅ 使用内置简单格式化器: ${path.basename(absPath)}`);
            }
          } catch (error) {
            console.warn(`内置简单格式化器失败:`, error);
          }
        }
        
        // 确保文档已保存
        if (document.isDirty) {
          const saveResult = await document.save();
          if (!saveResult && retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
            continue;
          }
        }
        
        // 成功，退出重试循环
        break;
        
      } catch (err) {
        retryCount++;
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        
        if (retryCount >= maxRetries) {
          console.warn(`格式化失败，已重试 ${maxRetries} 次:`, errorMsg);
          break;
        } else {
          console.warn(`格式化失败，第 ${retryCount} 次重试:`, errorMsg);
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }
      }
    }
  }

  /**
   * 内置简单格式化器
   * 作为最后的回退方案，提供基本的代码格式化
   */
  private simpleFormat(content: string): string {
    try {
      let formatted = content;
      
      // 1. 统一换行符
      formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // 2. 移除行尾空格
      formatted = formatted.replace(/[ \t]+$/gm, '');
      
      // 3. 确保文件末尾有换行符
      if (!formatted.endsWith('\n')) {
        formatted += '\n';
      }
      
      // 4. 修复基本的缩进问题
      const lines = formatted.split('\n');
      const fixedLines: string[] = [];
      let indentLevel = 0;
      const indentSize = 2;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // 跳过空行
        if (!trimmed) {
          fixedLines.push('');
          continue;
        }
        
        // 计算当前行的缩进
        const currentIndent = line.length - line.trimStart().length;
        const expectedIndent = indentLevel * indentSize;
        
        // 调整缩进
        const newLine = ' '.repeat(expectedIndent) + trimmed;
        fixedLines.push(newLine);
        
        // 更新缩进级别
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
          indentLevel++;
        } else if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }
      
      formatted = fixedLines.join('\n');
      
      // 5. 修复 import 语句的排序和格式
      const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
      const imports = formatted.match(importRegex) || [];
      if (imports.length > 0) {
        // 排序 import 语句
        const sortedImports = imports.sort();
        
        // 替换 import 语句
        let importIndex = 0;
        formatted = formatted.replace(importRegex, () => {
          return sortedImports[importIndex++] || '';
        });
      }
      
      // 6. 修复 export 语句的格式
      formatted = formatted.replace(/^export\s+import\s+(\w+)\s*=\s*(\w+);?\s*$/gm, 'export import $1 = $2;');
      
      return formatted;
      
    } catch (error) {
      console.warn('内置格式化器出错:', error);
      return content; // 出错时返回原内容
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
