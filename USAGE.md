# YTT 使用文档

## 目录

- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [使用流程](#使用流程)
- [生成文件说明](#生成文件说明)
- [全局类型使用](#全局类型使用)
- [高级功能](#高级功能)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 快速开始

### 1. 安装扩展

```bash
# 从 VSIX 文件安装
code --install-extension ytt-1.1.4.vsix
```

### 2. 基础配置

在工作区根目录创建 `ytt.json`：

```json
{
  "yapiUrl": "http://yapi.yourcompany.com",
  "username": "your_username",
  "password": "your_password",
  "requestFunctionFilePath": "./src/api/request.ts",
  "outputPath": "./src/api"
}
```

### 3. 启动生成

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `启动 YAPI 终端工具`
3. 按提示选择：分组 → 项目 → 菜单
4. 等待生成完成

## 详细配置

### 配置文件选项

#### `ytt.json`（推荐）

```json
{
  "yapiUrl": "http://yapi.example.com",
  "username": "your_username",
  "password": "your_password",
  "requestFunctionFilePath": "./src/api/request.ts",
  "outputPath": "./src/api",
  "importFunctionNames": ["get", "post", "put", "delete"]
}
```

#### VS Code 设置

```json
{
  "ytt.yapiUrl": "http://yapi.example.com",
  "ytt.username": "your_username",
  "ytt.password": "your_password",
  "ytt.outputPath": "./src/api"
}
```

### 配置项说明

| 配置项 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `yapiUrl` | string | ✅ | - | YAPI 服务器地址 |
| `username` | string | ✅ | - | YAPI 用户名 |
| `password` | string | ✅ | - | YAPI 密码 |
| `requestFunctionFilePath` | string | ✅ | - | 请求函数文件路径 |
| `outputPath` | string | ❌ | `./src/api` | 代码输出目录 |
| `importFunctionNames` | string[] | ❌ | `["get", "post"]` | 导入的请求函数名 |

## 使用流程

### 步骤 1：选择分组

扩展会显示所有可用的分组：

```
📁 步骤 2: 选择分组...
📋 找到 3 个分组:
   1. 前端项目 (ID: 1)
   2. 后端项目 (ID: 2)
   3. 测试项目 (ID: 3)
```

### 步骤 2：选择项目

选择分组后，显示该分组下的项目：

```
📂 步骤 3: 选择项目...
📋 找到 2 个项目:
   1. 用户管理系统 (ID: 101)
   2. 订单管理系统 (ID: 102)
```

### 步骤 3：选择菜单

选择项目后，显示该项目的接口菜单：

```
🔗 步骤 4: 选择接口...
📋 找到 5 个接口
```

选择菜单后，扩展会显示该菜单下的所有接口：

```
📋 已选择 1 个菜单:
   - 用户管理 (3 个接口)
     • [GET] /api/user/info
     • [POST] /api/user/create
     • [PUT] /api/user/update
```

### 步骤 4：生成代码

确认选择后，扩展开始生成代码：

```
⚡ 步骤 5: 生成代码...
📁 输出目录: ./src/api
✅ 所有代码处理完成! 🚀🚀🚀生成 3 个接口!
   1. [GET] /api/user/info
   2. [POST] /api/user/create
   3. [PUT] /api/user/update
```

## 生成文件说明

### 目录结构

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

### 文件内容示例

#### `interfaces.ts`

```typescript
//「公共分类」自动生成的 TypeScript 接口定义
// 生成时间: 2024-01-15 10:30:00
// 请不要手动修改此文件，每次生成都会覆盖！！！

/**
 * 获取分类列表 请求参数
 */
export interface GetCategoryListParams {
  /** 分类ID */
  categoryId: number;
  /** 是否包含子分类 */
  includeChildren?: boolean;
}

/**
 * 获取分类列表 响应参数
 */
export interface GetCategoryListResponse {
  /** 分类列表 */
  categories: {
    id: number;
    name: string;
    parentId?: number;
  }[];
  /** 总数 */
  total: number;
}
```

#### `apis.ts`

```typescript
//「公共分类」自动生成的 API 请求函数
// 生成时间: 2024-01-15 10:30:00
// 请不要手动修改此文件，每次生成都会覆盖！！！

import { get, post } from '../../request';

import { GetCategoryListParams, GetCategoryListResponse, CreateCategoryParams, CreateCategoryResponse } from './interfaces';

type GetConfig = Parameters<typeof get>[2];
type PostConfig = Parameters<typeof post>[2];

/**
 * 获取分类列表
 * 请求方法: GET
 * 请求路径: /api/category/list
 */
export const getCategoryList = async (params: GetCategoryListParams, config?: GetConfig) => {
  return get<GetCategoryListResponse>('/api/category/list', params, config);
};

/**
 * 创建分类
 * 请求方法: POST
 * 请求路径: /api/category/create
 */
export const createCategory = async (params: CreateCategoryParams, config?: PostConfig) => {
  return post<CreateCategoryResponse>('/api/category/create', params, config);
};
```

#### `index.ts`（模块级）

```typescript
//「公共分类」API 模块导出文件
// 生成时间: 2024-01-15 10:30:00
// 请不要手动修改此文件，每次生成都会覆盖！！！

export * from './interfaces';
export * from './apis';
```

#### `global.d.ts`

```typescript
// 自动生成的全局类型声明文件
// 生成时间: 2024-01-15 10:30:00

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

## 全局类型使用

### 基本用法

```typescript
// 直接使用全局类型，无需导入
const params: API.GongGongFenLei.GetCategoryListParams = {
  categoryId: 123,
  includeChildren: true
};

function handleCategoryList(data: API.GongGongFenLei.GetCategoryListResponse) {
  console.log(data.categories[0].name);
}
```

### 泛型辅助类型

```typescript
// 自定义泛型辅助类型
type ApiParams<T extends keyof typeof API> = T extends keyof typeof API 
  ? Parameters<typeof API[T][keyof typeof API[T]]>[0]
  : never;

type ApiResponse<T extends keyof typeof API> = T extends keyof typeof API
  ? ReturnType<typeof API[T][keyof typeof API[T]]>
  : never;

// 使用示例
type CategoryParams = ApiParams<'GongGongFenLei'>;
type CategoryResponse = ApiResponse<'GongGongFenLei'>;
```

### 类型守卫

```typescript
// 创建类型守卫函数
function isCategoryModule(module: keyof typeof API): module is 'GongGongFenLei' {
  return module === 'GongGongFenLei';
}

// 使用类型守卫
function processApiModule(module: keyof typeof API) {
  if (isCategoryModule(module)) {
    // 这里 module 被推断为 'GongGongFenLei'
    const categoryTypes = API[module];
    // categoryTypes 的类型是 API.GongGongFenLei
  }
}
```

## 高级功能

### 增量更新

扩展支持增量更新，不会覆盖已有内容：

1. **全局类型**：只添加新的命名空间映射
2. **时间戳更新**：每次生成都会更新文件头的时间戳

### 原子写入

扩展使用原子写入机制，防止并发写入导致的内容丢失：

1. 先写入临时文件
2. 写入成功后重命名覆盖目标文件
3. 失败时自动回退到直接写入

### 智能格式化

扩展会自动检测并使用项目中的格式化工具：

1. **Prettier 优先**：优先使用 `node_modules/prettier`
2. **插件支持**：自动加载 `prettier-plugin-organize-imports` 等插件
3. **配置读取**：读取 `.prettierrc` 和 `.editorconfig`
4. **ESLint 集成**：自动执行 ESLint 修复
5. **多重保障**：失败时回退到 VSCode 格式化

### 静默文件操作

扩展使用静默文件操作，不会干扰用户当前工作：

1. **不打开文件**：生成过程中不会打开新文件
2. **不关闭文件**：不会关闭用户当前打开的文件
3. **后台处理**：所有操作在后台静默执行
4. **状态保持**：保持用户的编辑状态

### 文件状态管理

扩展具有完善的文件状态管理机制：

1. **冲突处理**：自动处理"文件内容较新"冲突
2. **状态同步**：确保文件系统状态正确
3. **错误恢复**：在错误后自动恢复文件状态
4. **重试机制**：失败时自动重试

## 最佳实践

### 1. 项目结构建议

```
project/
├── src/
│   ├── api/                  # YTT 输出目录
│   │   ├── gonggongfenlei/
│   │   ├── xinbanbenxiaodianliebiao/
│   │   ├── index.ts
│   │   └── global.d.ts
│   ├── request.ts            # 请求函数文件
│   └── types/
│       └── api.ts           # 自定义 API 类型
├── ytt.json                 # YTT 配置
├── .prettierrc              # Prettier 配置
├── .eslintrc.js             # ESLint 配置
└── .vscode/
    └── settings.json        # VSCode 设置
```

### 2. 请求函数文件示例

```typescript
// src/request.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => Promise.reject(error)
);

export const get = <T = any>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return instance.get(url, { params, ...config });
};

export const post = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return instance.post(url, data, config);
};

export const put = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  return instance.put(url, data, config);
};

export const del = <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  return instance.delete(url, config);
};
```

### 3. 格式化配置

#### `.prettierrc`

```json
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

#### `.eslintrc.js`

```javascript
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

#### `.vscode/settings.json`

```json
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

### 4. 类型扩展

```typescript
// src/types/api.ts
import { API } from '../api/global';

// 扩展全局 API 类型
declare global {
  namespace API {
    // 添加通用响应类型
    interface CommonResponse<T = any> {
      code: number;
      message: string;
      data: T;
    }
    
    // 添加分页类型
    interface PaginationParams {
      page: number;
      pageSize: number;
    }
    
    interface PaginationResponse<T = any> {
      list: T[];
      total: number;
      page: number;
      pageSize: number;
    }
  }
}
```

### 5. 错误处理

```typescript
// src/utils/apiError.ts
export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): never => {
  if (error.response) {
    const { status, data } = error.response;
    throw new ApiError(status, data.message || '请求失败', data);
  } else if (error.request) {
    throw new ApiError(0, '网络错误', error.request);
  } else {
    throw new ApiError(-1, error.message || '未知错误');
  }
};
```

### 6. API 调用封装

```typescript
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { handleApiError } from '../utils/apiError';

export function useApi<T extends (...args: any[]) => Promise<any>>(apiFn: T) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: Parameters<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFn(...args);
      return result;
    } catch (err) {
      const error = handleApiError(err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { execute, loading, error };
}
```

## 故障排除

### 常见问题

#### 1. 连接 YAPI 失败

**症状**：提示"配置不完整"或"连接失败"

**解决方案**：
- 检查 `yapiUrl` 是否正确
- 确认用户名密码是否正确
- 检查网络连接
- 确认 YAPI 服务器是否可访问

#### 2. 生成代码格式不正确

**症状**：代码没有按 Prettier 格式化

**解决方案**：
```bash
# 安装 Prettier 和相关插件
npm install -D prettier prettier-plugin-organize-imports

# 创建 .prettierrc
echo '{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-organize-imports"]
}' > .prettierrc
```

#### 3. 全局类型不生效

**症状**：`API.模块名.*` 类型提示不显示

**解决方案**：
1. 检查 `global.d.ts` 文件是否存在
2. 重启 TypeScript 服务：`Ctrl+Shift+P` → `TypeScript: Restart TS Server`
3. 检查 `tsconfig.json` 是否包含该文件

#### 4. 文件内容丢失

**症状**：生成后文件内容不完整

**解决方案**：
- 扩展已使用原子写入机制，通常不会出现此问题
- 如果仍有问题，请检查磁盘空间和文件权限
- 避免在生成过程中手动编辑文件

#### 5. 菜单目录名问题

**症状**：目录名不是期望的格式

**解决方案**：
- 中文菜单名会自动转拼音
- 如需英文目录名，请在 YAPI 中使用英文菜单名
- 生成后可手动重命名目录（需同步更新相关文件）

#### 6. 格式化问题

**症状**：生成的代码没有被正确格式化

**解决方案**：
1. 确保安装了 Prettier 和相关插件
2. 检查 `.prettierrc` 配置是否正确
3. 确保 ESLint 配置正确
4. 检查 VSCode 设置中的格式化配置

#### 7. 文件打开问题

**症状**：生成文件时打开了不需要的文件

**解决方案**：
- 扩展已使用静默文件操作，不会打开新文件
- 如果仍有问题，请检查 VSCode 设置
- 确保没有其他扩展干扰

### 调试技巧

#### 1. 查看扩展日志

1. 打开 VS Code 开发者工具：`Help` → `Toggle Developer Tools`
2. 查看 Console 中的错误信息
3. 检查 Network 标签页的网络请求

#### 2. 检查生成的文件

1. 确认所有文件都已生成
2. 检查文件内容是否完整
3. 验证类型定义是否正确
4. 检查格式化是否正确

#### 3. 测试 API 调用

```typescript
// 测试生成的 API 函数
import { getCategoryList } from './api/gonggongfenlei/apis';

async function testApi() {
  try {
    const result = await getCategoryList({ categoryId: 123 });
    console.log('API 调用成功:', result);
  } catch (error) {
    console.error('API 调用失败:', error);
  }
}
```

### 性能优化

#### 1. 减少生成频率

- 只在接口有变化时重新生成
- 使用增量更新避免重复生成

#### 2. 优化请求函数

```typescript
// 使用缓存减少重复请求
const cache = new Map();

export const get = async <T = any>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const cacheKey = `${url}?${JSON.stringify(params)}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await instance.get(url, { params, ...config });
  cache.set(cacheKey, result);
  
  return result;
};
```

#### 3. 类型优化

```typescript
// 使用更精确的类型定义
interface ApiResponse<T> {
  code: 200 | 400 | 401 | 403 | 404 | 500;
  message: string;
  data: T;
}

// 避免使用 any
type StrictApiResponse<T> = T extends infer U ? U : never;
```

---

**需要帮助？**

如果遇到其他问题，请：
1. 查看 [FAQ](README.md#常见问题faq)
2. 检查 [变更日志](CHANGELOG.md)
3. 提交 Issue 或联系维护者