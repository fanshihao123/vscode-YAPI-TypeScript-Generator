# YTT · YAPI TypeScript Generator

基于 YAPI 自动生成 TypeScript 类型与请求函数的 VSCode 扩展。

## 功能特性

- 🔗 连接 YAPI：通过账号登录，拉取分组/项目/接口信息
- 🧭 交互式终端：命令面板一键启动“YAPI 终端工具”，逐步选择分组 → 项目 → 菜单
- 🗂️ 模块化生成：按“菜单”拆分目录，分别输出 `interfaces.ts`、`apis.ts`、`index.ts`
- ♻️ 主索引追加：根 `index.ts` 会按菜单模块“去重追加”，并在每次更新后刷新时间戳
- 🧾 命名规范：
  - 函数名：`<methodPrefix><PathParts>`（如：`getV3ShopPopList`）
  - 接口名：`PascalCase`，不带 `Interface` 后缀；请求/响应后缀分别为 `Params`、`Response`
- 🧹 注释清洗：服务端返回的 HTML 描述自动清洗，统一输出多行块注释
- 🧠 类型推断：
  - 请求：从 `req_query.example/desc` 智能推断类型
  - 响应：优先识别 JSON Schema，严格按 `required/properties/items` 递归生成
- 🧰 代码格式化：优先使用项目内 Prettier（读取 `.prettierrc` 与插件），失败回退 VSCode 格式化
- 📝 文件头信息：每次生成都会刷新“生成时间”；子模块文件头会带上对应的“菜单名”
- 🔤 菜单目录命名：中文转拼音，英文保留原位，清理非法字符，保证可用与尽量唯一（依赖 `pinyin`）

## 系统要求

- VS Code ≥ 1.54.0
- Node.js 环境

## 安装与配置

1) 从 VS Code 扩展市场安装本扩展

2) 在 VS Code 设置（settings.json）中配置以下项（配置节：`ytt`）：

- `ytt.yapiUrl`: YAPI 服务器地址
- `ytt.username`: YAPI 用户名
- `ytt.password`: YAPI 密码
- `ytt.outputPath`: 代码输出目录（默认 `./src/api`）
  
或在工作区根目录创建 `ytt.json`（优先级更高）：

```json
{
  "yapiUrl": "http://yapi.example.com",
  "username": "your_name",
  "password": "your_password",
  "requestFunctionFilePath": "./src/api/request.ts",
  "outputPath": "./src/api"
}
```

说明：当前生成 `apis.ts` 需要 `requestFunctionFilePath`（请求函数导入路径）。如未在 VS Code 设置提供该项，请在 `ytt.json` 中配置。

3) Cookie 认证：扩展自动处理 `_yapi_token` 与 `_yapi_uid`

## 快速开始

1) 打开命令面板（Cmd/Ctrl+Shift+P）
2) 执行命令：`启动 YAPI 终端工具`（命令 ID：`ytt.startTerminal`）
3) 依次选择 分组 → 项目 → 菜单
4) 确认生成，扩展会在 `ytt.outputPath` 下输出代码

### 生成的目录结构（示例）

```
src/api/
├── 菜单A/
│   ├── interfaces.ts
│   ├── apis.ts
│   └── index.ts
├── 菜单B/
│   ├── interfaces.ts
│   ├── apis.ts
│   └── index.ts
└── index.ts         # 根索引，汇总全部菜单导出
```

## 生成规则说明

- 函数命名：HTTP 方法前缀取自配置 `methodNamePrefix`（默认：`get/post/put/delete/patch`），路径片段经驼峰化，版本号保留如 `V3`。
- 接口命名：基于函数名去掉方法前缀后再 `PascalCase`，并追加 `Params`/`Response` 后缀。
- 注释：
  - 清洗 `<p><a>...` 等标签，转义 HTML 实体
  - 生成多行块注释 `/** ... */`
- 请求参数：仅基于 `req_query` 生成（按需扩展），从 `example/desc` 智能推断类型
- 响应：优先解析 JSON Schema（含 `required/properties/items`），缺省回退示例推断
- 根索引去重：根 `index.ts` 仅对新增菜单块进行追加，避免重复与覆盖
- 格式化：优先本地 `node_modules/prettier`（含插件目录检索），否则 VS Code 格式化
- 菜单目录命名：中文→拼音；英文与数字按原位置保留；移除不合法文件名字符
- 时间戳刷新：每次生成或更新，文件头都会刷新 `// 生成时间: ...`

## 使用示例

```ts
// 以 getV3ShopPopList 为例
import { V3ShopPopListParams, V3ShopPopListResponse } from './api/菜单A/interfaces';
import { getV3ShopPopList } from './api/菜单A/apis';

const params: V3ShopPopListParams = { /* ... */ };
const data: V3ShopPopListResponse = await getV3ShopPopList(params);
```

## 常见问题（FAQ）

- 生成代码未按 Prettier 格式化？
  1) 确认项目安装了 `prettier` 与相关插件；
  2) `.prettierignore` 未忽略生成目录；
  3) 多根工作区时，确保生成目录在当前工作区根内。

- 出现 `[object Promise]` 或写入报错？
  - 生成器已限制写入仅接受字符串；如仍发生，请反馈具体接口以便定位。

- `requestFunctionFilePath` 如何配置？
  - 可在工作区 `ytt.json` 中配置（推荐）；或在 VS Code 设置的 `ytt` 配置节中增加该项（若扩展版本暂未暴露该字段，请先使用 `ytt.json`）。

- 根 `index.ts` 会不会被覆盖？
  - 不会。根索引采用“去重追加”，并在每次更新后刷新文件头生成时间。

## 变更日志

详见 `CHANGELOG.md`。

## 许可证

MIT License

—— 祝使用愉快！
