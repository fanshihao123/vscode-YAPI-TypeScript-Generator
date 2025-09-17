# YTT · YAPI TypeScript Generator

基于 YAPI 自动生成 TypeScript 类型与请求函数的 VSCode 扩展。

[![Version](https://img.shields.io/badge/version-1.1.8-blue.svg)](https://marketplace.visualstudio.com/items?itemName=fanda.ytt)
[![Downloads](https://img.shields.io/badge/downloads-1000+-green.svg)](https://marketplace.visualstudio.com/items?itemName=fanda.ytt)
[![Rating](https://img.shields.io/badge/rating-4.5%2F5-yellow.svg)](https://marketplace.visualstudio.com/items?itemName=fanda.ytt)

## 功能特性

- 🔗 **连接 YAPI**：通过账号登录，拉取分组/项目/接口信息
- 🧭 **交互式终端**：命令面板一键启动"YAPI 终端工具"，逐步选择分组 → 项目 → 菜单
- 🗂️ **模块化生成**：按"菜单"拆分目录，分别输出 `interfaces.ts`、`apis.ts`、`index.ts`
- ♻️ **增量更新**：`global.d.ts` 会按菜单模块"去重追加"，并在每次更新后刷新时间戳
- 🌐 **全局类型**：自动生成 `global.d.ts`，提供全局 `API` 命名空间，支持 `API.模块名.*` 类型访问
- 🧾 **智能命名规范**：
  - 函数名：`<methodPrefix><LastPathSegment>`（如：`getPartnerRankShareUrl`、`getSShopList`）
  - 接口名：`PascalCase`，去掉HTTP方法前缀；请求/响应后缀分别为 `Params`、`Response`
  - 菜单目录：中文转拼音，英文保留原位，清理非法字符
  - 自动处理路径段，保持原有驼峰格式，移除特殊字符和数字前缀
- 🧹 **注释清洗**：服务端返回的 HTML 描述自动清洗，统一输出多行块注释
- 🧠 **智能类型推断**：
  - 请求：从 `req_query.example/desc` 智能推断类型
  - 响应：优先识别 JSON Schema，严格按 `required/properties/items` 递归生成
- 🧰 **智能格式化**：优先使用项目内 Prettier（读取 `.prettierrc` 与插件），失败回退 VSCode 格式化
- 📝 **文件头信息**：每次生成都会刷新"生成时间"；子模块文件头会带上对应的"菜单名"
- 🔒 **原子写入**：使用临时文件+重命名机制，避免并发写入导致的内容丢失
- 🎯 **Prettier 增强**：自动检测并加载 `prettier-plugin-organize-imports` 等插件，确保 import 排序
- 🔧 **ESLint 集成**：自动执行 ESLint 修复，确保代码质量
- 🛡️ **文件状态管理**：完善的冲突处理和错误恢复机制

## 为什么选择 YTT？

| 特性 | YTT | 其他工具 |
|------|-----|----------|
| 🎯 **交互式选择** | ✅ 图形化终端选择分组/项目/菜单 | ❌ 需要手动配置项目ID |
| 🌐 **全局类型** | ✅ 自动生成全局API命名空间 | ❌ 需要手动导入类型 |
| 🗂️ **模块化** | ✅ 按菜单自动分目录生成 | ❌ 所有接口混在一个文件 |
| ♻️ **增量更新** | ✅ 智能去重，只更新变化部分 | ❌ 每次都全量覆盖 |
| 🧠 **智能类型推断** | ✅ 从example/desc自动推断 | ❌ 大部分使用any类型 |
| 🧹 **注释清洗** | ✅ 自动清洗HTML标签 | ❌ 保留原始HTML格式 |
| 🧰 **智能格式化** | ✅ 自动检测Prettier/ESLint | ❌ 需要手动格式化 |
| 🔒 **原子写入** | ✅ 防止并发写入冲突 | ❌ 可能出现文件损坏 |

## 系统要求

- VS Code ≥ 1.50.0
- Node.js 环境
- 网络连接（用于访问YAPI服务器）

## 安装与配置

### 1. 安装扩展

#### 方式一：从扩展市场安装（推荐）
1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（Mac）打开扩展面板
3. 搜索 "YAPI TypeScript Generator" 或 "ytt"
4. 点击安装

#### 方式二：本地安装
```bash
# 下载 .vsix 文件后安装
code --install-extension ytt-1.1.8.vsix
```

#### 方式三：从源码安装
```bash
# 克隆项目
git clone https://github.com/fanshihao123/vscode-YAPI-TypeScript-Generator.git
cd vscode-YAPI-TypeScript-Generator

# 安装依赖
npm install

# 编译
npm run compile

# 打包
npm run package
```

### 2. 配置 YAPI 连接

在 VS Code 设置（settings.json）中配置以下项（配置节：`ytt`）：

```json
{
  "ytt.yapiUrl": "http://yapi.example.com",
  "ytt.username": "your_name", 
  "ytt.password": "your_password",
  "ytt.outputPath": "./src/api"
}
```

或在工作区根目录创建 `ytt.json`（优先级更高）：

```json
{
  "yapiUrl": "http://yapi.example.com",
  "username": "your_name",
  "password": "your_password",
  "requestFunctionFilePath": "./src/api/request.ts",
  "outputPath": "./src/api",
  "importFunctionNames": ["get", "post"]
}
```

### 3. 配置说明

- `yapiUrl`: YAPI 服务器地址
- `username`: YAPI 用户名
- `password`: YAPI 密码
- `outputPath`: 代码输出目录（默认 `./src/api`）
- `requestFunctionFilePath`: 请求函数导入路径（必需）
- `importFunctionNames`: 导入的请求函数名数组（默认 `["get", "post"]`）

**注意**：扩展会自动处理 Cookie 认证（`_yapi_token` 与 `_yapi_uid`）

## 快速开始

### 🚀 3分钟快速体验

1. **安装扩展**
   ```bash
   # 从 VS Code 扩展市场搜索 "YAPI TypeScript Generator" 安装
   # 或使用本地安装
   code --install-extension ytt-1.1.8.vsix
   ```

2. **配置 YAPI 连接**
   ```json
   // 在 VS Code 设置中添加
   {
     "ytt.yapiUrl": "http://your-yapi-server.com",
     "ytt.username": "your_username",
     "ytt.password": "your_password",
     "ytt.outputPath": "./src/api"
   }
   ```

3. **启动生成工具**
   - 按 `Cmd/Ctrl+Shift+P` 打开命令面板
   - 输入 `启动 YAPI 终端工具` 或 `ytt.startTerminal`
   - 依次选择：分组 → 项目 → 菜单
   - 确认生成

4. **查看生成结果**
   ```
   src/api/
   ├── 菜单目录/
   │   ├── interfaces.ts    # 接口类型定义
   │   ├── apis.ts         # API 请求函数
   │   └── index.ts        # 模块导出
   └── global.d.ts         # 全局类型声明
   ```

### 📝 使用生成的代码

```typescript
// 方式1：使用全局类型（推荐）
const params: API.模块名.接口名Params = { /* 参数 */ };
const data: API.模块名.接口名Response = await 接口函数(params);

// 方式2：传统导入方式
import { 接口名Params, 接口名Response } from './api/模块名/interfaces';
import { 接口函数 } from './api/模块名/apis';
```

### 🎯 实际使用示例

假设您有一个用户管理相关的接口：

**YAPI 接口信息：**
- 路径：`/api/v1/user/profile`
- 方法：`GET`
- 标题：`获取用户信息`

**生成的代码：**

```typescript
// interfaces.ts
export interface GetUserProfileParams {
  /** 用户ID */
  userId: number;
  /** 是否包含详细信息 */
  includeDetails?: boolean;
}

export interface GetUserProfileResponse {
  /** 用户基本信息 */
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  /** 用户统计信息 */
  stats?: {
    loginCount: number;
    lastLoginTime: string;
  };
}

// apis.ts
export const getUserProfile = async (params: GetUserProfileParams, config?: GetConfig) => {
  return get<GetUserProfileResponse>('/api/v1/user/profile', params, config);
};
```

**在项目中使用：**

```typescript
// 使用全局类型（推荐）
async function fetchUserProfile(userId: number) {
  const params: API.UserProfile.GetUserProfileParams = {
    userId,
    includeDetails: true
  };
  
  const data: API.UserProfile.GetUserProfileResponse = await getUserProfile(params);
  console.log(`用户 ${data.user.name} 的信息：`, data.user);
  return data;
}

// 或者使用传统导入
import { GetUserProfileParams, GetUserProfileResponse } from './api/user-profile/interfaces';
import { getUserProfile } from './api/user-profile/apis';

async function fetchUserProfile(userId: number) {
  const params: GetUserProfileParams = { userId };
  const data: GetUserProfileResponse = await getUserProfile(params);
  return data;
}
```

### 生成的目录结构

```
src/api/
├── gonggongfenlei/              # 菜单目录（中文转拼音）
│   ├── interfaces.ts            # 接口类型定义
│   ├── apis.ts                 # API 请求函数
│   └── index.ts                # 模块导出
├── xinbanbenxiaodianliebiao/    # 另一个菜单
│   ├── interfaces.ts
│   ├── apis.ts
│   └── index.ts
└── global.d.ts                 # 全局类型声明
```

## 全局类型使用

扩展会自动生成 `global.d.ts`，提供全局 `API` 命名空间：

```typescript
// 全局类型声明（自动生成）
import type * as __API__gonggongfenlei from './gonggongfenlei/interfaces';
import type * as __API__xinbanbenxiaodianliebiao from './xinbanbenxiaodianliebiao/interfaces';

declare global {
  namespace API {
    export import GongGongFenLei = __API__gonggongfenlei;
    export import XinBanBenXiaoDianLieBiao = __API__xinbanbenxiaodianliebiao;
  }
}

export {};
```

### 使用示例

```typescript
// 直接使用全局类型，无需导入
const params: API.GongGongFenLei.GetCategoryListParams = {
  categoryId: 123,
  includeChildren: true
};

function handleResponse(data: API.GongGongFenLei.GetCategoryListResponse) {
  console.log(data.categories[0].name);
}

// 或者使用传统的导入方式
import { GetCategoryListParams, GetCategoryListResponse } from './api/gonggongfenlei/interfaces';
import { getCategoryList } from './api/gonggongfenlei/apis';

const params: GetCategoryListParams = { categoryId: 123 };
const data: GetCategoryListResponse = await getCategoryList(params);
```

## 生成规则说明

### 函数命名规则

- HTTP 方法前缀：`get`、`post`、`put`、`delete`、`patch`
- URL 最后一段：直接使用，保持原有驼峰格式
- 自动处理连字符和下划线，移除特殊字符和数字前缀
- 去掉拼接 id 的逻辑，保持简洁命名
- 示例：`GET /api/AffiliatePartner/getPartnerRankShareUrl` → `getPartnerRankShareUrl`
- 示例：`GET /api/shop/sShopList` → `getSShopList`
- 示例：`POST /api/user/create-profile` → `createCreateProfile`

### 接口命名规则

- 基于函数名去掉HTTP方法前缀后转换为 `PascalCase`
- 请求参数：`XxxParams`
- 响应数据：`XxxResponse`
- 示例：`getPartnerRankShareUrl` → `PartnerRankShareUrlParams`、`PartnerRankShareUrlResponse`
- 示例：`getSShopList` → `SShopListParams`、`SShopListResponse`
- 示例：`createCreateProfile` → `CreateProfileParams`、`CreateProfileResponse`

### 类型推断规则

- **请求参数**：从 `req_query.example` 和 `desc` 智能推断类型
- **响应数据**：优先解析 JSON Schema，严格按 `required/properties/items` 递归生成
- **注释清洗**：自动清洗 HTML 标签，转义 HTML 实体，生成多行块注释

### 文件更新策略

- **增量更新**：`global.d.ts` 采用"去重追加"策略
- **时间戳刷新**：每次生成都会更新文件头的"生成时间"
- **原子写入**：使用临时文件+重命名，避免并发写入导致的内容丢失

## 高级配置

### 性能优化建议

1. **项目结构优化**
   - 建议将生成的API文件放在独立的目录中（如`src/api/`）
   - 避免在大型项目中一次性生成所有接口
   - 可以按模块分批生成，提高生成速度

2. **缓存策略**
   - 扩展会自动缓存YAPI登录状态
   - 建议定期清理缓存以获取最新接口信息
   - 可以通过重启VS Code来清理缓存

3. **网络优化**
   - 确保网络连接稳定，避免生成过程中断
   - 对于大型项目，建议在网络较好的环境下生成
   - 可以考虑使用本地YAPI镜像提高访问速度

### 智能格式化

扩展会自动检测并使用项目中的格式化工具：

1. **Prettier 优先**：优先使用 `node_modules/prettier`
2. **插件支持**：自动加载相关插件：
   - `prettier-plugin-organize-imports`
   - `@trivago/prettier-plugin-sort-imports`
3. **配置读取**：读取 `.prettierrc` 和 `.editorconfig`
4. **ESLint 集成**：自动执行 ESLint 修复
5. **多重保障**：失败时回退到 VSCode 格式化

### 推荐的项目配置

```json
// package.json
{
  "devDependencies": {
    "prettier": "^3.0.0",
    "prettier-plugin-organize-imports": "^3.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-organize-imports"]
}
```

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 常见问题（FAQ）

### Q: 生成代码未按 Prettier 格式化？

**A:** 请检查以下几点：
1. 确认项目安装了 `prettier` 与相关插件
2. 检查 `.prettierignore` 是否忽略了生成目录
3. 多根工作区时，确保生成目录在当前工作区根内
4. 检查 Prettier 配置文件是否正确
5. 确保 ESLint 配置正确

### Q: 出现 `[object Promise]` 或写入报错？

**A:** 这通常是生成器返回了 Promise 而非字符串。请：
1. 检查 `requestFunctionFilePath` 配置是否正确
2. 确认请求函数文件存在且导出正确
3. 如问题持续，请反馈具体接口信息

### Q: `requestFunctionFilePath` 如何配置？

**A:** 推荐在工作区根目录创建 `ytt.json`：
```json
{
  "requestFunctionFilePath": "./src/api/request.ts"
}
```

### Q: 每个菜单目录下的 `index.ts` 会不会被覆盖？

**A:** 会。每个菜单目录下的 `index.ts` 是模块导出文件，每次生成都会重新生成：
- 导出该菜单下的所有接口类型和 API 函数
- 每次生成都会更新文件头的"生成时间"
- 这是正常的模块化设计

### Q: 全局类型不生效？

**A:** 请检查：
1. 确保 `global.d.ts` 文件存在
2. 检查 TypeScript 配置是否包含该文件
3. 重启 TypeScript 服务：`Ctrl+Shift+P` → `TypeScript: Restart TS Server`

### Q: 菜单目录名是拼音，如何自定义？

**A:** 当前版本自动将中文转拼音。如需自定义，可以：
1. 在 YAPI 中使用英文菜单名
2. 生成后手动重命名目录（注意同步更新 `index.ts` 和 `global.d.ts`）

### Q: 生成文件时打开了不需要的文件？

**A:** 扩展已使用静默文件操作：
- 生成过程中不会打开新文件
- 不会关闭用户当前打开的文件
- 所有操作在后台静默执行

### Q: 出现"文件内容较新"错误？

**A:** 扩展已实现完善的冲突处理：
- 自动处理"文件内容较新"冲突
- 使用原子写入机制防止内容丢失
- 失败时自动重试

### Q: 多行注释格式异常？

**A:** 扩展已优化注释处理：
- 自动清理已存在的多行注释标记
- 生成标准的多行注释格式
- 处理文件打开状态对生成的影响

### Q: 扩展无法连接到YAPI服务器？

**A:** 请检查以下几点：
1. 确认YAPI服务器地址是否正确
2. 检查网络连接是否正常
3. 确认用户名和密码是否正确
4. 检查YAPI服务器是否支持Cookie认证
5. 尝试在浏览器中手动登录YAPI确认账号状态

### Q: 生成的代码格式不正确？

**A:** 请检查：
1. 项目是否安装了Prettier和相关插件
2. 检查`.prettierrc`配置文件是否正确
3. 确认ESLint配置是否正确
4. 尝试手动运行`npm run format`格式化代码

### Q: 全局类型不生效？

**A:** 请检查：
1. 确保`global.d.ts`文件存在且内容正确
2. 检查`tsconfig.json`是否包含该文件
3. 重启TypeScript服务：`Ctrl+Shift+P` → `TypeScript: Restart TS Server`
4. 确认项目根目录下有`global.d.ts`文件

## 开发与贡献

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd fd0829

# 安装依赖
npm install

# 编译
npm run compile

# 打包
npm run package
```

### 项目结构

```
src/
├── extension.ts           # 扩展入口
├── services/
│   ├── terminalService.ts # 终端交互服务
│   └── yapiService.ts     # YAPI API 服务
├── generators/
│   └── codeGenerator.ts   # 代码生成器
├── utils/
│   ├── fileManager.ts     # 文件管理
│   ├── configManager.ts   # 配置管理
│   └── index.ts          # 工具函数
├── types/
│   └── yapi.ts           # YAPI 类型定义
└── constants.ts          # 常量定义
```

## 版本历史

### v1.1.8 (最新)
- 🔧 修复命名策略相关问题
- 📝 更新README文档
- 🐛 修复代码生成器中的类型推断逻辑
- ✨ 优化错误处理和用户体验

### v1.1.7
- ✨ 优化命名策略，保持原有驼峰格式
- 🔧 改进路径处理逻辑，移除特殊字符和数字前缀
- 🐛 修复接口命名规则，正确去掉HTTP方法前缀
- 📝 更新文档和示例

### v1.1.5
- 🎯 增强类型推断能力
- 🧹 优化注释清洗功能
- 🔒 改进文件写入机制

### v1.1.4
- 🌐 添加全局类型支持
- 🗂️ 实现模块化生成
- ♻️ 支持增量更新

详见 `CHANGELOG.md` 获取完整变更历史。

## 许可证

MIT License

## 支持与反馈

### 获取帮助
- 📖 查看 [使用文档](USAGE.md) 获取详细使用指南
- 🐛 遇到问题？请查看 [常见问题](#常见问题faq) 或提交 [Issue](https://github.com/fanshihao123/vscode-YAPI-TypeScript-Generator/issues)
- 💡 有好的建议？欢迎提交 [Feature Request](https://github.com/fanshihao123/vscode-YAPI-TypeScript-Generator/issues/new?template=feature_request.md)

### 贡献代码
我们欢迎社区贡献！请查看 [开发指南](#开发与贡献) 了解如何参与开发。

### 支持项目
如果这个扩展对您有帮助，请考虑：
- ⭐ 给项目点个 Star
- 🐛 报告 Bug 或提出改进建议
- 📢 分享给其他开发者

---

**祝使用愉快！** 🚀

*让 YAPI 接口文档自动生成 TypeScript 代码，提升开发效率！*