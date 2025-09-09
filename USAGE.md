# YAPI TypeScript Generator 使用说明

## 快速开始

### 1. 安装扩展

在 VSCode 中安装此扩展后，您就可以开始使用 YAPI TypeScript Generator 了。

### 2. 选择使用方式

本扩展提供两种使用方式：

#### 🚀 方式一：终端交互式工具（推荐）

这是最友好的使用方式，提供逐步引导的接口选择：

1. **启动终端工具**：
   - 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
   - 输入 "启动 YAPI 终端工具" 并选择
   - 或者直接使用快捷键

2. **按步骤操作**：
   - **步骤 1**: 验证配置 - 自动检查 YAPI 连接设置
   - **步骤 2**: 选择分组 - 从可用分组中选择要处理的分组
   - **步骤 3**: 选择项目 - 从分组下的项目中选择目标项目
   - **步骤 4**: 选择接口 - 多选需要生成的接口
   - **步骤 5**: 生成代码 - 自动生成 TypeScript 文件

3. **查看结果**：
   - 在终端输出中查看详细的操作日志
   - 选择是否打开生成的文件

#### ⚡ 方式二：传统命令方式

直接生成所有接口，适合批量处理场景。

### 3. 配置 YAPI 设置

在使用扩展之前，您需要配置 YAPI 相关设置：

1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 输入 "配置 YAPI 设置" 并选择
3. 按照提示输入以下信息：
   - **YAPI 服务器地址**: 您的 YAPI 服务器地址（例如：`http://yapi.example.com`）
   - **用户名**: 您的 YAPI 账号用户名
   - **密码**: 您的 YAPI 账号密码
   - **项目 ID**: YAPI 项目的 ID（从项目 URL 中获取）
   - **输出路径**: 生成的 TypeScript 文件保存路径（默认：`./src/api`）

### 4. 生成 TypeScript 接口

配置完成后，您可以开始生成 TypeScript 接口：

1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 输入 "从 YAPI 生成 TypeScript 接口" 并选择
3. 扩展将自动：
   - 连接 YAPI 服务器
   - 获取项目中的所有接口
   - 生成 TypeScript 接口定义
   - 生成对应的 API 请求函数
   - 创建相关文件

## 生成的文件结构

扩展会在您指定的输出路径下生成以下文件：

```
src/api/
├── interfaces.ts    # TypeScript 接口定义
├── apis.ts         # API 请求函数
└── index.ts        # 模块导出文件
```

## 使用生成的代码

### 导入接口和 API

```typescript
// 导入生成的接口和 API 函数
import { 
  UserListRequest, 
  UserListResponse, 
  userList,
  CreateUserRequest,
  CreateUserResponse,
  createUser
} from './src/api';
```

### 使用 API 请求函数

```typescript
// 获取用户列表
async function getUserList() {
  try {
    const params: UserListRequest = {
      page: 1,
      size: 10,
      keyword: 'test'
    };

    const response: UserListResponse = await userList(params);
    console.log('用户列表:', response.data);
  } catch (error) {
    console.error('获取用户列表失败:', error);
  }
}

// 创建用户
async function createNewUser() {
  try {
    const userData: CreateUserRequest = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      role: 'user'
    };

    const response: CreateUserResponse = await createUser(userData);
    console.log('用户创建成功:', response.data);
  } catch (error) {
    console.error('创建用户失败:', error);
  }
}
```

## 配置说明

### 工作区设置

您也可以在 VSCode 工作区设置中配置 YAPI 参数：

```json
{
  "ytt.yapiUrl": "http://yapi.example.com",
  "ytt.username": "your-yapi-username",
  "ytt.password": "your-yapi-password",
  "ytt.projectId": "your-project-id-here",
  "ytt.outputPath": "./src/api"
}
```

### 获取 YAPI 账号信息

1. 确保您有 YAPI 服务器的账号
2. 记住您的用户名和密码
3. 确保您有访问目标项目的权限

## 特性说明

### 自动类型推断

扩展会根据 YAPI 接口的参数类型自动推断 TypeScript 类型：

- `string` → `string`
- `number` → `number`
- `boolean` → `boolean`
- `array` → `any[]`
- `object` → `any`
- `file` → `File`
- `date` → `string`
- `datetime` → `string`

### 接口命名规则

- 接口名称基于 YAPI 接口标题生成
- 自动移除特殊字符和中文字符
- 遵循 TypeScript 命名规范
- 自动添加 `Request` 和 `Response` 后缀

### 错误处理

- 配置验证：检查必要的配置项是否完整
- 网络错误：处理 YAPI 服务器连接问题
- 文件操作：处理文件写入和目录创建错误
- 用户友好的错误提示

## 故障排除

### 常见问题

1. **配置验证失败**
   - 确保所有配置项都已填写
   - 检查 YAPI 服务器地址是否正确
   - 验证访问令牌是否有效

2. **网络连接失败**
   - 检查网络连接
   - 确认 YAPI 服务器是否可访问
   - 验证用户名和密码是否正确
   - 验证项目 ID 是否正确

3. **文件生成失败**
   - 检查输出路径是否有写入权限
   - 确保磁盘空间充足
   - 验证路径格式是否正确

### 获取帮助

如果遇到问题，请：

1. 检查 VSCode 的输出面板中的错误信息
2. 查看扩展的日志信息
3. 提交 Issue 到项目仓库

## 更新日志

### 1.0.0
- 初始版本
- 支持从 YAPI 生成 TypeScript 接口
- 支持生成 API 请求函数
- 支持配置管理
- 支持文件自动生成
