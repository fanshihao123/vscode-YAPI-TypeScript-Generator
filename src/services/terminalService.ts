import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { YAPIService } from './yapiService';
import { CodeGenerator } from '../generators/codeGenerator';
import { FileManager } from '../utils/fileManager';
import { ConfigManager } from '../utils/configManager';
import { YAPIGroup, YAPIProject, YAPIMenuList, YAPIInterface } from '../types/yapi';
import pinyin from 'pinyin';

export class TerminalService {
  private outputChannel: vscode.OutputChannel;
  private yapiService: YAPIService | null = null;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('YAPI Terminal');
  }

  /**
   * 启动终端交互式工具
   */
  async start(): Promise<void> {
    this.outputChannel.show();
    this.log('🚀 YAPI TypeScript 生成器终端工具已启动');
    this.log('=====================================');

    try {
      // 步骤1: 验证配置
      await this.validateConfiguration();
      
      // 步骤2: 选择分组
      const selectedGroup = await this.selectGroup();
      if (!selectedGroup) {
        this.log('❌ 未选择分组，操作取消');
        return;
      }

      // 步骤3: 选择项目
      const selectedProject = await this.selectProject(selectedGroup._id);
      if (!selectedProject) {
        this.log('❌ 未选择项目，操作取消');
        return;
      }

      // 步骤4: 选择菜单
      const selectedMenus = await this.selectMenuList(selectedProject._id);
      if (!selectedMenus || selectedMenus.length === 0) {
        this.log('❌ 未选择任何菜单，操作取消');
        return;
      }

      // 步骤5: 获取菜单下所有接口详情
      const selectedInterfaces = await this.getInterfacesDetail(selectedMenus);
      if (!selectedInterfaces || selectedInterfaces.length === 0) {
        this.log('❌ 未选择任何接口，操作取消');
        return;
      }

      // 步骤6: 生成代码
      await this.generateCode(selectedInterfaces,selectedMenus);

    } catch (error) {
      this.log(`❌ 操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证配置
   */
  private async validateConfiguration(): Promise<void> {
    this.log('📋 步骤 1: 验证配置...');
    
    const config = ConfigManager.getConfig();
    const validation = ConfigManager.validateConfig(config);
    
    if (!validation.isValid) {
      this.log('❌ 配置不完整:');
      validation.errors.forEach(error => this.log(`   - ${error}`));
      
      // const result = await vscode.window.showErrorMessage(
      //   '配置不完整，是否现在配置？',
      //   '配置设置',
      //   '取消'
      // );
      
      // if (result === '配置设置') {
      //   await vscode.commands.executeCommand('ytt.configureYAPI');
      //   // 重新验证配置
      //   const newConfig = ConfigManager.getConfig();
      //   const newValidation = ConfigManager.validateConfig(newConfig);
      //   if (!newValidation.isValid) {
      //     throw new Error('配置仍然不完整');
      //   }
      // } else {
      //   throw new Error('配置不完整');
      // }
    }

    this.log('✅ 配置验证通过');
    
    // 创建 YAPI 服务
    this.yapiService = new YAPIService(config);
    this.log(`🔗 连接到 YAPI 服务器: ${config.yapiUrl}`);
  }

  /**
   * 选择分组
   */
  private async selectGroup(): Promise<YAPIGroup | null> {
    this.log('\n📁 步骤 2: 选择分组...');
    
    if (!this.yapiService) {
      throw new Error('YAPI 服务未初始化');
    }

    try {
      const groups = await this.yapiService.getGroups();
      this.log(`📋 找到 ${groups.length} 个分组:`);
      
      groups.forEach((group, index) => {
        this.log(`   ${index + 1}. ${group.group_name} (ID: ${group._id})`);
      });

      // 显示选择对话框
      const groupNames = groups.map(group => group.group_name);
      const selectedGroupName = await vscode.window.showQuickPick(groupNames, {
        placeHolder: '请选择要处理的分组',
        canPickMany: false
      });

      if (!selectedGroupName) {
        return null;
      }

      const selectedGroup = groups.find(group => group.group_name === selectedGroupName);
      this.log(`✅ 已选择分组: ${selectedGroupName}`);
      return selectedGroup || null;

    } catch (error) {
      this.log(`❌ 获取分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 选择项目
   */
  private async selectProject(groupId: number): Promise<YAPIProject | null> {
    this.log('\n📂 步骤 3: 选择项目...');
    
    if (!this.yapiService) {
      throw new Error('YAPI 服务未初始化');
    }

    try {
      const projects = await this.yapiService.getProjects(groupId);
      this.log(`📋 找到 ${projects.length} 个项目:`);
      projects.forEach((project, index) => {
        this.log(`   ${index + 1}. ${project.name || '未命名项目'} (ID: ${project._id})`);
      });

      // 显示选择对话框
      const projectNames = projects.map(project => project.name || '未命名项目');
      const selectedProjectName = await vscode.window.showQuickPick(projectNames, {
        placeHolder: '请选择要处理的项目',
        canPickMany: false
      });

      if (!selectedProjectName) {
        return null;
      }

      const selectedProject = projects.find(project => 
        (project.name || '未命名项目') === selectedProjectName
      );
      this.log(`✅ 已选择项目: ${selectedProjectName}`);
      return selectedProject || null;

    } catch (error) {
      this.log(`❌ 获取项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 选择接口菜单列表 
   * 1.按菜单批量选择
   * 2.按接口批量选择
   */
  private async selectMenuList(projectId: number): Promise<YAPIMenuList[] | null> {
    this.log('\n🔗 步骤 4: 选择接口...');
    
    if (!this.yapiService) {
      throw new Error('YAPI 服务未初始化');
    }

    try {
      const menuList = await this.yapiService.getProjectDetailMenuList(projectId);
      this.log(`📋 找到 ${menuList.length} 个接口`);
      
      // menuList.forEach((menu, index) => {
      //   this.log(`   ${index + 1}. [${menu.list[0].method}] ${menu.name}`);
      //   this.log(`      路径: ${menu.list[0].path}`);
      //   if (menu.desc) {
      //     this.log(`      描述: ${menu.desc}`);
      //   }
      // });


      let selectedMenus: YAPIMenuList[] = [];

      selectedMenus = await this.selectByMenu(menuList);
      // TODO：后续完善 目前只能按菜单批量选择
      // 选择选择模式
      // const selectionMode = await this.selectSelectionMode();
      // if (!selectionMode) {
      //   return null;
      // }

      // if (selectionMode === 'menu') {
      //   // 按菜单批量选择
      //   selectedAPIs = await this.selectByMenu(menuList);
      // } else {
      //   // 按接口批量选择
      //   selectedAPIs = await this.selectByInterface(menuList);
      // }

      if (!selectedMenus || selectedMenus.length === 0) {
        return null;
      }

      // this.log(`✅ 已选择 ${selectedMenus.length} 个接口:`);
      // selectedMenus.forEach(api => {
      //   this.log(`   - [${api.list[0].method}] ${api.name}`);
      // });

      return selectedMenus;

    } catch (error) {
      this.log(`❌ 获取接口失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 选择选择模式
   */
  // private async selectSelectionMode(): Promise<'menu' | 'interface' | null> {
  //   const modeOptions = [
  //     {
  //       label: '$(list-tree) 按菜单批量选择',
  //       description: '按菜单分组选择，一次选择一个菜单下的所有接口',
  //       detail: '适合需要生成某个功能模块的所有接口',
  //       value: 'menu'
  //     },
  //     {
  //       label: '$(symbol-method) 按接口批量选择',
  //       description: '单独选择每个接口，更灵活精确',
  //       detail: '适合需要精确控制生成哪些接口',
  //       value: 'interface'
  //     }
  //   ];

  //   const selected = await vscode.window.showQuickPick(modeOptions, {
  //     placeHolder: '请选择接口选择模式',
  //     canPickMany: false
  //   });

  //   return selected?.value as 'menu' | 'interface' | null;
  // }

  /**
   * 按菜单批量选择接口
   */
  private async selectByMenu(menuList: YAPIMenuList[]): Promise<YAPIMenuList[]> {
    // this.log('\n📁 按菜单选择模式:');
    
    // 按菜单分组显示
    const menuOptions = menuList.map(menu => ({
      label: `$(folder) ${menu.name}`,
      description: `${menu.list.length} 个接口`,
      detail: menu.desc || '无描述',
      api: menu
    }));

    const selectedMenu = await vscode.window.showQuickPick(menuOptions, {
      placeHolder: '请选择要生成的菜单',
      canPickMany: false
      // placeHolder: '请选择要生成的菜单 (可多选)',
      // canPickMany: true
    });
    if (!selectedMenu) {
      return [];
    }
    
    return [selectedMenu.api as YAPIMenuList];

    // if (!selectedMenus || selectedMenus.length === 0) {
    //   return [];
    // }


    // const selectedAPIs = selectedMenu.map(item => item.api as YAPIMenuList);
    // this.log(`📋 已选择 ${selectedAPIs.length} 个菜单:`);
    // selectedAPIs.forEach(menu => {
    //   this.log(`   - ${menu.name} (${menu.list.length} 个接口)`);
    // });

    // return selectedAPIs;
  }

  /**
   * 批量获取接口详情
   */
  private async getInterfacesDetail(menuList: YAPIMenuList[]): Promise<YAPIInterface[][]> {
    if (!this.yapiService) {
      throw new Error('YAPI 服务未初始化');
    }
    // [[],[]] 按菜单分组返回接口详情数据
    const interfacesDetail = [];
    let list: YAPIInterface[] = [];
    for (const menu of menuList) {
      list = [];  
      for (const api of menu.list) {
        const interfaces = await this.yapiService.getInterfaces(api._id);
        list.push(interfaces);
      }
      interfacesDetail.push(list);
    }
    return interfacesDetail;
  }

  /**
   * 按接口批量选择
   */
  // private async selectByInterface(menuList: YAPIMenuList[]): Promise<YAPIMenuList[]> {
  //   this.log('\n🔗 按接口选择模式:');
    
  //   // 将所有接口展平显示
  //   const allInterfaces: Array<{
  //     label: string;
  //     description: string;
  //     detail: string;
  //     menu: YAPIMenuList;
  //     interface: any;
  //   }> = [];

  //   menuList.forEach(menu => {
  //     menu.list.forEach(api => {
  //       allInterfaces.push({
  //         label: `[${api.method}] ${api.title || api.path}`,
  //         description: `${menu.name} - ${api.path}`,
  //         detail: api.title || '无描述',
  //         menu: menu,
  //         interface: api
  //       });
  //     });
  //   });

  //   const selectedInterfaces = await vscode.window.showQuickPick(allInterfaces, {
  //     placeHolder: '请选择要生成的接口 (可多选)',
  //     canPickMany: true
  //   });

  //   if (!selectedInterfaces || selectedInterfaces.length === 0) {
  //     return [];
  //   }

  //   // 按菜单分组返回选中的接口
  //   const menuMap = new Map<number, YAPIMenuList>();
    
  //   selectedInterfaces.forEach(item => {
  //     const menuId = item.menu._id;
  //     if (!menuMap.has(menuId)) {
  //       // 创建新的菜单对象，只包含选中的接口
  //       const newMenu = { ...item.menu };
  //       newMenu.list = [];
  //       menuMap.set(menuId, newMenu);
  //     }
      
  //     const menu = menuMap.get(menuId)!;
  //     menu.list.push(item.interface);
  //   });

  //   const selectedAPIs = Array.from(menuMap.values());
  //   this.log(`🔗 已选择 ${selectedInterfaces.length} 个接口，分布在 ${selectedAPIs.length} 个菜单中:`);
    
  //   selectedAPIs.forEach(menu => {
  //     this.log(`   - ${menu.name} (${menu.list.length} 个接口)`);
  //     menu.list.forEach(api => {
  //       this.log(`     • [${api.method}] ${api.title || api.path}`);
  //     });
  //   });

  //   return selectedAPIs;
  // }

  /**
   * 生成代码
   * @paraminterfaceList [[],[]] 按菜单分组返回接口详情数据
   */
  private async generateCode(interfaceList: YAPIInterface[][],menuList: YAPIMenuList[]): Promise<void> {
    this.log('\n⚡ 步骤 5: 生成代码...');

    
    try {
      const config = ConfigManager.getConfig();
      
      // 创建代码生成器
      const codeGenerator = new CodeGenerator();
      
      // 为每个菜单生成独立的文件
      const menuFiles: Array<{
        menuName: string;
        fileName: string;
        filePath: string;
        interfaces: any[];
        apis: any[];
      }> = [];

      

      // 按菜单分组生成代码
      for (const interfaces of interfaceList) {
        if (interfaces && interfaces.length > 0) {
          // 生成该菜单下的接口定义 interfaces.ts
          const menuInterfaces = codeGenerator.generateInterfaces(interfaces);
          // 生成该菜单下的API请求函数 apis.ts
          const menuAPIs = codeGenerator.generateAPIs(interfaces);
          // 生成文件名
          const fileName = this.generateFileName(menuList[0].name);
          
          menuFiles.push({
            menuName: menuList[0].name,
            fileName: fileName,
            filePath: '',
            interfaces: menuInterfaces,
            apis: menuAPIs
          });
        }
      }

      // this.log(`📝 将为 ${menuFiles.length} 个菜单生成独立的文件夹`);

      // 创建文件管理器
      const fileManager = new FileManager();
      
      // 确保输出目录存在
      await fileManager.ensureDirectoryExists(config.outputPath);
      this.log(`📁 输出目录: ${config.outputPath}`);

      // 检查现有文件，避免覆盖
      // const existingFiles = await this.checkExistingFiles(config.outputPath, menuFiles);
      
      // if (existingFiles.length > 0) {
      //   this.log(`⚠️  发现 ${existingFiles.length} 个现有文件，将进行增量更新`);
      //   const shouldContinue = await this.confirmIncrementalUpdate(existingFiles);
      //   if (!shouldContinue) {
      //     this.log('❌ 用户取消操作');
      //     return;
      //   }
      // }

      // 为每个菜单创建独立的文件
      const createdFiles: string[] = [];
      const updatedFiles: string[] = [];

      for (const menuFile of menuFiles) {
        try {
          // 创建菜单专用的目录
          const menuDir = `${config.outputPath}/${menuFile.fileName}`;
          await fileManager.ensureDirectoryExists(menuDir);
          
          // 检查文件是否已存在
          const interfacesPath = `${menuDir}/interfaces.ts`;
          const apisPath = `${menuDir}/apis.ts`;
          const indexPath = `${menuDir}/index.ts`;
          
          const interfacesExist = await this.fileExists(interfacesPath);
          const apisExist = await this.fileExists(apisPath);
          const indexExist = await this.fileExists(indexPath);
          
          // TODO:如果文件已存在，进行增量更新 默认关闭  后续优化功能
          if ((interfacesExist || apisExist || indexExist) && false) {
            // 文件已存在，进行增量更新
            this.log(`🔄 菜单 "${menuFile.menuName}" 文件已存在，进行增量更新:`);
            
            if (interfacesExist) {
              await this.updateInterfacesFile(interfacesPath, menuFile.interfaces);
              updatedFiles.push(interfacesPath);
              this.log(`   📄 更新接口文件: ${fileManager.getRelativePath(interfacesPath)}`);
            } else {
              await fileManager.writeInterfacesFile(menuDir, menuFile.interfaces,menuFile.menuName);
              createdFiles.push(interfacesPath);
              this.log(`   📄 创建接口文件: ${fileManager.getRelativePath(interfacesPath)}`);
            }
            
            if (apisExist) {
              console.log('menuFile.apis 存在',);
              await this.updateAPIsFile(apisPath, menuFile.apis);
              updatedFiles.push(apisPath);
              this.log(`   📄 更新API文件: ${fileManager.getRelativePath(apisPath)}`);
            } else {
              await fileManager.writeAPIsFile(menuDir, menuFile.apis,menuFile.menuName );
              createdFiles.push(apisPath);
              this.log(`   📄 创建API文件: ${fileManager.getRelativePath(apisPath)}`);
            }
            
            if (indexExist) {
              this.log(`   📄 索引文件已存在，跳过: ${fileManager.getRelativePath(indexPath)}`);
            } else {
              await fileManager.writeIndexFile(menuDir,menuFile.menuName);
              createdFiles.push(indexPath);
              this.log(`   📄 创建索引文件: ${fileManager.getRelativePath(indexPath)}`);
            }
          } else {
            // 文件不存在，创建新文件
            // this.log(`📝文件不存在，创建新文件, 菜单 "${menuFile.menuName}" 创建新文件:`);
            // interfaces 文件
            const newInterfacesPath = await fileManager.writeInterfacesFile(menuDir, menuFile.interfaces,menuFile.menuName);
            // apis 文件
            const newApisPath = await fileManager.writeAPIsFile(menuDir, menuFile.apis,menuFile.menuName);
            // index 文件
            const newIndexPath = await fileManager.writeIndexFile(menuDir,menuFile.menuName);
            
            createdFiles.push(newInterfacesPath, newApisPath, newIndexPath);
            
            // this.log(`   📄 接口文件: ${fileManager.getRelativePath(newInterfacesPath)}`);
            // this.log(`   📄 API 文件: ${fileManager.getRelativePath(newApisPath)}`);
            // this.log(`   📄 索引文件: ${fileManager.getRelativePath(newIndexPath)}`);
          }
          
        } catch (error) {
          this.log(`❌ 菜单 "${menuFile.menuName}" 文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
      // 生成或更新主索引文件
      const mainIndexPath = await this.updateMainIndexFile(config.outputPath, menuFiles);
      
      // this.log('✅ 所有代码处理完成!');
      interfaceList[0]?.forEach((menu, index) => {
        this.log(`   ${index + 1}. [${menu.method}] ${menu.path}`);
      });
      this.log(`✅ 所有代码处理完成! 🚀🚀🚀生成 ${interfaceList[0]?.length} 个接口!`);
      //   this.log(`   ${index + 1}. [${menu.list[0].method}] ${menu.name}`);
      //   this.log(`      路径: ${menu.list[0].path}`);
      //   if (menu.desc) {
      //     this.log(`      描述: ${menu.desc}`);
      //   }
      // });
      // this.log(`   📄 新创建文件: ${createdFiles.length} 个`);
      // this.log(`   📄 更新文件: ${updatedFiles.length} 个`);
      // this.log(`   📄 主索引文件: ${fileManager.getRelativePath(mainIndexPath)}`);

      // 询问是否打开生成的文件
      const result = await vscode.window.showInformationMessage(
        `成功处理 ${interfaceList.length} 个菜单的 TypeScript 文件!`,
        '打开主索引文件',
        '打开所有新文件',
        '在文件资源管理器中显示'
      );

      // 根据用户选择执行操作
      switch (result) {
        case '打开主索引文件':
          await fileManager.openFile(mainIndexPath);
          break;
        case '打开所有新文件':
          for (const filePath of [...createdFiles, mainIndexPath]) {
            await fileManager.openFile(filePath);
          }
          break;
        case '在文件资源管理器中显示':
          await vscode.commands.executeCommand('revealInExplorer', mainIndexPath);
          break;
      }

    } catch (error) {
      this.log(`❌ 代码生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 生成文件名字（中文会转为拼音 英文保持不变）
   */
  private generateFileName(menuName: string): string {
    return menuName.replace(/[\u4e00-\u9fa5]/g, (match) => {
      const name = pinyin(match,{style:'NORMAL'});
      return name.join('');
    });
  }

 


  /**
   * 检查现有文件，避免覆盖
   */
  // private async checkExistingFiles(outputPath: string, menuFiles: Array<{
  //   menuName: string;
  //   fileName: string;
  //   filePath: string;
  //   interfaces: any[];
  //   apis: any[];
  // }>): Promise<string[]> {
  //   const fileManager = new FileManager();
  //   const existingFiles: string[] = [];

  //   for (const menuFile of menuFiles) {
  //     const interfacesPath = `${outputPath}/${menuFile.fileName}/interfaces.ts`;
  //     const apisPath = `${outputPath}/${menuFile.fileName}/apis.ts`;
  //     const indexPath = `${outputPath}/${menuFile.fileName}/index.ts`;

  //     if (await this.fileExists(interfacesPath)) {
  //       existingFiles.push(interfacesPath);
  //     }
  //     if (await this.fileExists(apisPath)) {
  //       existingFiles.push(apisPath);
  //     }
  //     if (await this.fileExists(indexPath)) {
  //       existingFiles.push(indexPath);
  //     }
  //   }
  //   return existingFiles;
  // }

  /**
   * 确认增量更新
   */
  // private async confirmIncrementalUpdate(existingFiles: string[]): Promise<boolean> {
  //   const fileManager = new FileManager();
  //   let message = `发现 ${existingFiles.length} 个现有文件，将进行增量更新。\n\n`;
  //   existingFiles.forEach(file => message += `- ${fileManager.getRelativePath(file)}\n`);
  //   message += `\n是否继续？`;

  //   const result = await vscode.window.showWarningMessage(
  //     message,
  //     '继续',
  //     '取消'
  //   );
  //   return result === '继续';
  // }

  /**
   * 文件是否存在
   */
  /**
   * 检查指定文件路径的文件是否存在
   * @param filePath 文件路径
   * @returns 存在返回 true，不存在返回 false
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      // 规范化路径，防止相对路径导致判断失效
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      return true; // 文件存在
    } catch (error) {
      // console.log('文件不存在:', filePath, error);
      return false; // 文件不存在
    }
  }

  /**
   * 更新接口文件
   */
  private async updateInterfacesFile(filePath: string, interfaces: any[]): Promise<void> {
    const fileManager = new FileManager();
    const currentContent = await fs.promises.readFile(filePath, 'utf8');
    let newContent = `// 自动生成的 YAPI TypeScript 接口文件
// 生成时间: ${new Date().toLocaleString()}
// 包含 ${interfaces.length} 个接口

`;
    newContent += `export const INTERFACE_COUNT = ${interfaces.length};\n`;
    newContent += `export const INTERFACE_NAMES = ${JSON.stringify(interfaces.map(i => i.name), null, 2)};\n\n`;
    newContent += `export default {\n  INTERFACE_COUNT,\n  INTERFACE_NAMES,\n  ${interfaces.map(i => `${i.name}: require('./${i.name}')`).join(',\n  ')}\n};\n`;

    await fs.promises.writeFile(filePath, newContent, 'utf8');
    await fileManager.formatFile(filePath);
  }

  /**
   * 更新API文件
   */
  private async updateAPIsFile(filePath: string, apis: any[]): Promise<void> {
    const fileManager = new FileManager();
    const currentContent = await fs.promises.readFile(filePath, 'utf8');
    let newContent = `// 自动生成的 YAPI TypeScript API文件
// 生成时间: ${new Date().toLocaleString()}
// 包含 ${apis.length} 个API

`;
    newContent += `export const API_COUNT = ${apis.length};\n`;
    newContent += `export const API_NAMES = ${JSON.stringify(apis.map(a => a.name), null, 2)};\n\n`;
    newContent += `export default {\n  API_COUNT,\n  API_NAMES,\n  ${apis.map(a => `${a.name}: require('./${a.name}')`).join(',\n  ')}\n};\n`;

    await fs.promises.writeFile(filePath, newContent, 'utf8');
    await fileManager.formatFile(filePath);
  }

  /**
   * 生成或更新主索引文件
   */
  private async updateMainIndexFile(outputPath: string, menuFiles: Array<{
    menuName: string;
    fileName: string;
    filePath: string;
    interfaces: any[];
    apis: any[];
  }>): Promise<string> {
    const fileManager = new FileManager();
    
    const mainIndexPath = `${outputPath}/index.ts`;
    const fullPath = path.resolve(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', mainIndexPath);

    // 读取已存在内容（若无则初始化头部）
    let existingContent = '';
    try {
      existingContent = await fs.promises.readFile(fullPath, 'utf8');
    } catch {
      existingContent = `// 自动生成的 YAPI TypeScript 接口主索引文件\n// 生成时间: ${new Date().toLocaleString()}\n// 请不要手动修改此文件，每次生成都会覆盖！！！\n\n`;
    }


    for (const menuFile of menuFiles) {
      const block = `\n// ${menuFile.menuName} 模块\nexport * from './${menuFile.fileName}/interfaces';\nexport * from './${menuFile.fileName}/apis';\nexport * from './${menuFile.fileName}/index';\n\n`;
      const signature = `export * from './${menuFile.fileName}/interfaces';`;
      if (!existingContent.includes(signature)) {
        // 确保文件以换行结束再追加
        if (!existingContent.endsWith('\n')) {
          existingContent += '\n';
        }
        existingContent += block;
      }
    }


    // 每次更新都更新头部“生成时间”行
      const nowLine = `// 生成时间: ${new Date().toLocaleString()}`;
      const timeRegex = /^\/\/\s*生成时间:.*$/m;
      if (timeRegex.test(existingContent)) {
        existingContent = existingContent.replace(timeRegex, nowLine);
      } else {
        const headerTitle = '// 自动生成的 YAPI TypeScript 接口主索引文件';
        if (existingContent.startsWith(headerTitle)) {
          // 在标题行后插入时间行
          existingContent = existingContent.replace(headerTitle, `${headerTitle}\n${nowLine}`);
        } else {
          // 没有标准头部，直接在文件顶部追加时间行
          existingContent = `${nowLine}\n${existingContent}`;
        }
      }

    await fs.promises.writeFile(fullPath, existingContent, 'utf8');
    await fileManager.formatFile(fullPath);
    return fullPath;
  }

  /**
   * 输出日志到终端
   */
  private log(message: string): void {
    this.outputChannel.appendLine(message);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
