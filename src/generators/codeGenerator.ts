import { DEFAULT_IMPORT_FUNCTION_NAMES } from '../constants';
import { YAPIInterface, GeneratedInterface, GeneratedAPI, YAPIParam } from '../types/yapi';
import { getConfigTypeName } from '../utils';
import { ConfigManager } from '../utils/configManager';

// 配置接口
interface CodeGeneratorConfig {
  methodNamePrefix: {
    GET: string;
    POST: string;
    PUT: string;
    DELETE: string;
    PATCH: string;
    [key: string]: string;
  };
  typeMapping: { [key: string]: string };
  generateComments: boolean; // 是否生成注释
  baseURL: string; // 基础URL，用于拼接完整的URL
  outputFormat: 'fetch' | 'axios' | 'request'; // 输出格式
  timeout: number; // 请求超时时间
}

export class CodeGenerator {
  private config: CodeGeneratorConfig;

  constructor(config?: Partial<CodeGeneratorConfig>) {
    this.config = {
      methodNamePrefix: {
        GET: 'get',
        POST: 'post',
        PUT: 'put',
        DELETE: 'delete',
        PATCH: 'patch'
      },
      typeMapping: {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'array': 'any[]',
        'object': 'any',
        'file': 'File',
        'date': 'string',
        'datetime': 'string',
        'integer': 'number',
        'float': 'number',
        'double': 'number',
        'long': 'number',
        'short': 'number',
        'byte': 'number',
        'binary': 'string',
        'password': 'string',
        'email': 'string',
        'url': 'string',
        'uri': 'string'
      },
      generateComments: true, // 默认生成注释
      baseURL: '', // 默认不拼接基础URL
      outputFormat: 'axios', // 默认输出 axios 格式
      timeout: 30000, // 默认超时时间 30 秒
      ...config
    };
  }
  /**
   * 生成 TypeScript 接口定义 interface.ts
   */
  generateInterfaces(interfaces: YAPIInterface[]): GeneratedInterface[] {
    const generatedInterfaces: GeneratedInterface[] = [];
    for (const apiInterface of interfaces) {
      const interfaceName = this.generateInterfaceName(apiInterface);
      const content = this.generateInterfaceContent(apiInterface);
      
      generatedInterfaces.push({
        name: interfaceName,
        content
      });
    }

    return generatedInterfaces;
  }

  /**
   * 生成 API 请求函数 api.ts
   */
  generateAPIs(interfaces: YAPIInterface[]): GeneratedAPI[] {
    const generatedAPIs: GeneratedAPI[] = [];
    for (const apiInterface of interfaces) {
      const apiName = this.generateAPIName(apiInterface);
      const content = this.generateAPIContent(apiInterface);
      
      generatedAPIs.push({
        name: apiName,
        content
      });
    }

    return generatedAPIs;
  }

  /**
   * 生成接口名称
   * 与API方法名保持一致，但改为PascalCase格式
   */
  private generateInterfaceName(apiInterface: YAPIInterface): string {
    let apiName = this.generateAPIName(apiInterface);
    // 去掉前缀（如get、post、put、delete、patch等），只保留后面的部分
    const methodPrefixes = Object.values(this.config.methodNamePrefix);
    for (const prefix of methodPrefixes) {
      if (apiName.startsWith(prefix)) {
        apiName = apiName.slice(prefix.length);
        break;
      }
    }
    // 转换为PascalCase格式（首字母大写）
    return apiName.charAt(0).toUpperCase() + apiName.slice(1);
  }

  /**
   * 生成 API 函数名称
   * 规则：按照接口路径命名保证唯一，使用 _id 字段，只保留最后1个路径段，直接使用路径生成驼峰命名
   * 例如：GET /api/shop/V3/shopPopList -> getShopPopList${id}
   */
  private generateAPIName(apiInterface: YAPIInterface): string {
    const path = apiInterface.path;
    const id = apiInterface._id || '';
    // 拆分路径，去除空字符串
    let paths = path.split('/').filter(Boolean);

    // 只保留最后1个路径段（如有），否则全部
    if (paths.length > 1) {
      paths = paths.slice(paths.length - 1);
    }

    // 处理路径段，全部转为驼峰（首字母大写，特殊字符去除）
    const pathParts = paths
      .map(part => {
        return part
          .replace(/[^a-zA-Z0-9]/g, '') // 移除特殊字符
          .replace(/^[0-9]/, '') // 移除开头的数字
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) // 处理连字符
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) // 处理下划线
          .replace(/^./, str => str.toUpperCase()); // 首字母大写
      })
      .filter(part => part.length > 0);

    // 方法前缀
    let methodName = this.config.methodNamePrefix[apiInterface.method.toUpperCase()].toLocaleLowerCase() || 'get';

    // 拼接路径段
    let name = methodName;
    for (const part of pathParts) {
      name += part;
    }

    // 拼接唯一id
    name += id ? `${id}` : '';

    return name;
  }

  /**
   * 清洗注释内容中的 HTML 标签，并转换为纯文本多行
   */
  private sanitizeComment(raw: string | undefined): string {
    if (!raw) return '';
    let text = String(raw);
    // 换行相关
    text = text.replace(/<br\s*\/?>(\r?\n)?/gi, '\n');
    text = text.replace(/<\/(p|div)>/gi, '\n');
    // 链接显示其可见文本或链接本身
    text = text.replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, '$1');
    // 去掉剩余所有标签
    text = text.replace(/<[^>]+>/g, '');
    // 解码常见实体
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // 规范换行，去掉多余空白
    text = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .join('\n')
      .trim();
    return text;
  }

  /**
   * 以多行块注释的形式包装注释文本
   */
  private toBlockComment(text: string): string {
    if (!text) return '';
    const lines = text.split('\n');
    const body = lines.map(l => ` * ${l}`.replace(/\s+$/g, '')).join('\n');
    return `/**\n${body}\n */\n`;
  }

  /**
   * 基于参数的 example/desc 智能推断 TS 类型
   */
  private getRequestParamType(param: YAPIParam): string {
    // 1) 先根据 example 推断
    const tFromExample = this.inferTypeFromExample(param.example);
    if (tFromExample) return tFromExample;
    // 2) 再根据描述中的关键词推断
    const tFromDesc = this.inferTypeFromDesc(param.desc);
    if (tFromDesc) return tFromDesc;
    // 3) 默认 string
    return 'string';
  }

  private inferTypeFromExample(example: string | undefined): string | null {
    if (!example) return null;
    const ex = String(example).trim();
    if (ex.length === 0) return null;

    // boolean
    if (/^(true|false)$/i.test(ex)) return 'boolean';

    // number (integer or float)
    if (/^-?\d+(\.\d+)?$/.test(ex)) return 'number';

    // JSON array
    if ((ex.startsWith('[') && ex.endsWith(']')) || (ex.startsWith('{') && ex.endsWith('}'))) {
      try {
        const parsed = JSON.parse(ex);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) {
            const first = parsed[0];
            const elemType = this.inferJsValueType(first);
            return `${elemType}[]`;
          }
          return 'any[]';
        }
        // object
        return 'Record<string, any>';
      } catch {
        // 非严格 JSON，忽略
      }
    }

    // 日期/时间
    const d = new Date(ex);
    if (!isNaN(d.getTime())) return 'string';

    // URL/邮箱常见场景也以 string 表示
    return 'string';
  }

  private inferTypeFromDesc(desc: string | undefined): string | null {
    if (!desc) return null;
    const text = desc.toLowerCase();
    if (/(bool|boolean|布尔)/.test(text)) return 'boolean';
    if (/(int|integer|浮点|数字|number|数值|整型|整数)/.test(text)) return 'number';
    if (/(array|列表|数组)/.test(text)) return 'any[]';
    if (/(object|对象|json)/.test(text)) return 'Record<string, any>';
    if (/(date|时间|日期|timestamp)/.test(text)) return 'string';
    return null;
  }

  private inferJsValueType(v: any): string {
    const t = typeof v;
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    if (Array.isArray(v)) return 'any[]';
    if (v && t === 'object') return 'Record<string, any>';
    return 'any';
  }

  /**
   * 清洗并规范参数名：
   * - 去除首尾空白
   * - 去除包裹的引号（单/双）
   * - 反转义 `\"`/`\'`
   * - 去掉内联空白
   * - 交给 ensureValidPropertyName 处理前缀数字与特殊字符
   */
  private sanitizePropertyKey(raw: string): string {
    if (raw == null) return 'prop';
    let name = String(raw);
    // 去首尾空白
    name = name.trim();
    // 反转义
    name = name.replace(/\\\"/g, '"').replace(/\\'/g, "'");
    // 如果整体被引号包裹，去掉包裹引号
    if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
      name = name.slice(1, -1);
    }
    // 去掉内部所有空白
    name = name.replace(/\s+/g, '');
    // 最终交给已有的属性名校验器
    return this.ensureValidPropertyName(name);
  }

  /**
   * 生成接口内容
   */
  private generateInterfaceContent(apiInterface: YAPIInterface): string {
    const interfaceName = this.generateInterfaceName(apiInterface);
    const requestInterfaceName = `${interfaceName}Params`;
    const responseInterfaceName = `${interfaceName}Response`;

    const headerComment = this.toBlockComment(this.sanitizeComment(apiInterface.title) + ' 请求参数');
    let content = headerComment || '';
    content += `export interface ${requestInterfaceName} {\n`;
    // console.log('apiInterface.req_query', apiInterface.req_query);
    // 查询参数（根据最新类型定义，仅保留 req_query） 
    if (apiInterface.req_query && apiInterface.req_query.length > 0) {
      for (const param of apiInterface.req_query) {
        const isRequired = param.required === '1';
       const type = this.getRequestParamType(param);
       const pDesc = this.sanitizeComment(param.desc);

       const paramName = this.sanitizePropertyKey(param.name);

       if (pDesc) {
         content += `  /** ${pDesc} */\n`;
       }
       content += `  ${paramName}${isRequired ? '' : '?'}: ${type};\n`;
     }
   }

    // 请求体（YAPI 当前定义未提供结构，保底提供 body）
    // 如未来扩展可从其它字段推断
    // content += `  // 请求体\n`;
    // content += `  body?: any;\n`;

    content += `}\n\n`;

    // 添加响应头注释
    const reseaderComment = this.toBlockComment(this.sanitizeComment(apiInterface.title) + ' 响应参数');
    content += reseaderComment || '';

    // 响应接口
    content += `export interface ${responseInterfaceName} {\n`;
    if (apiInterface.res_body && apiInterface.res_body_type === 'json') {
      try {
        const responseObj = JSON.parse(apiInterface.res_body);
        content += this.generateObjectInterface(responseObj, '  ');
      } catch (error) {
        content += `  // 响应数据 (JSON 解析失败)\n`;
        content += `  data?: any;\n`;
      }
    } else {
      content += `  data?: any;\n`;
    }
    content += `}\n`;

    return content;
  }

  /**
   * 获取 TypeScript 类型
   */
  private getTypeScriptType(yapiType: string): string {
    const mappedType = this.config.typeMapping[yapiType.toLowerCase()];
    if (mappedType) {
      return mappedType;
    }
    
    // 智能类型推断
    if (yapiType.includes('array')) {
      const baseType = yapiType.replace(/array/i, '').trim();
      const mappedBaseType = this.config.typeMapping[baseType] || 'any';
      return `${mappedBaseType}[]`;
    }
    
    if (yapiType.includes('[]')) {
      const baseType = yapiType.replace(/\[\]/g, '').trim();
      const mappedBaseType = this.config.typeMapping[baseType] || 'any';
      return `${mappedBaseType}[]`;
    }
    
    // 处理联合类型
    if (yapiType.includes('|')) {
      const types = yapiType.split('|').map(t => this.getTypeScriptType(t.trim()));
      return types.join(' | ');
    }
    
    return 'any';
  }

  /**
   * 判断是否为 JSON Schema 结构
   */
  private isJsonSchema(schema: any): boolean {
    return !!(schema && typeof schema === 'object' && (schema.$schema || schema.type || schema.properties || schema.items));
  }

  /**
   * 将 JSON Schema 节点转换为 TypeScript 类型（可能为多行内联对象）
   */
  private schemaToTsType(schema: any, indent: string): string {
    const t = schema && (schema.type || (schema.properties ? 'object' : (schema.items ? 'array' : undefined)));
    switch (t) {
      case 'object': {
        return `{
${this.generateFromJsonSchema(schema, indent)}${indent}}`;
      }
      case 'array': {
        const itemType = this.schemaToTsType(schema.items || {}, indent + '  ');
        return `${itemType}[]`;
      }
      case 'string':
        return 'string';
      case 'boolean':
        return 'boolean';
      case 'integer':
      case 'number':
      case 'float':
      case 'double':
        return 'number';
      default:
        return 'any';
    }
  }

  /**
   * 基于 JSON Schema 生成对象字段定义（用于 interface 花括号内）
   */
  private generateFromJsonSchema(schema: any, indent: string = ''): string {
    let content = '';
    const properties = (schema && schema.properties) || {};
    const required: string[] = Array.isArray(schema && schema.required) ? schema.required : [];
    const keys = Object.keys(properties);

    if (keys.length === 0) {
      content += `${indent}[key: string]: any;\n`;
      return content;
    }

    for (const key of keys) {
      const propSchema = properties[key] || {};
      const safeKey = this.ensureValidPropertyName(key);
      const optionalMark = required.includes(key) ? '' : '?';
      const typeStr = this.schemaToTsType(propSchema, indent + '  ');
      const desc = propSchema && propSchema.description ? this.sanitizeComment(propSchema.description) : '';
      if(desc) {
        content += `${indent}/** ${desc} */\n`;
      } 
      content += `${indent}${safeKey}${optionalMark}: ${typeStr};\n`;
    }

    return content;
  }

  /**
   * 生成对象接口
   * 支持 JSON Schema（优先）与示例数据两种模式
   */
  private generateObjectInterface(obj: any, indent: string = ''): string {
    let content = '';
    
    try {
      // 优先按 JSON Schema 解析
      if (this.isJsonSchema(obj)) {
        // 只解析data数据
        const data = obj.properties.data;
        const schema = {
          type: data.type || (data.properties ? 'object' : data.type),
          properties: data.properties,
          items: data.items,
          required: data.required
        };
        return this.generateFromJsonSchema(schema, indent);
      }

      content += `${indent}[key: string]: any;\n`;

      // Fallback：按示例数据推断
      // if (Array.isArray(obj)) {
      //   if (obj.length > 0) {
      //     const itemType = this.getTypeFromValue(obj[0]);
      //     content += `${indent}items: ${itemType}[];\n`;
      //   } else {
      //     content += `${indent}items: any[];\n`;
      //   }
      //   return content;
      // }
      
      // 处理对象示例
      // for (const [key, value] of Object.entries(obj)) {
      //   const type = this.getTypeFromValue(value);
      //   const safeKey = this.ensureValidPropertyName(key);
      //   const comment = this.generatePropertyComment(key, value);
        
      //   content += `${indent}${safeKey}: ${type};${comment}\n`;
      // }
    } catch (error) {
      console.warn('生成对象接口失败:', error);
      content += `${indent}// 类型推断失败，使用 any\n`;
      content += `${indent}[key: string]: any;\n`;
    }

    return content;
  }

  /**
   * 生成属性注释
   */
  // private generatePropertyComment(key: string, value: any): string {
  //   if (!this.config.generateComments) {
  //     return '';
  //   }
    
  //   let comment = '';
    
  //   // 添加类型信息
  //   if (typeof value === 'string') {
  //     if (this.isEmail(value)) {
  //       comment += ` // 邮箱地址`;
  //     } else if (this.isUrl(value)) {
  //       comment += ` // URL地址`;
  //     } else if (this.isDateString(value)) {
  //       comment += ` // 日期字符串`;
  //     } else if (value.length > 50) {
  //       comment += ` // 长文本`;
  //     } else {
  //       comment += ` // ${value}`;
  //     }
  //   } else if (typeof value === 'number') {
  //     if (Number.isInteger(value)) {
  //       comment += ` // 整数`;
  //     } else {
  //       comment += ` // 浮点数`;
  //     }
  //   } else if (typeof value === 'boolean') {
  //     comment += ` // 布尔值`;
  //   } else if (Array.isArray(value)) {
  //     comment += ` // 数组，长度: ${value.length}`;
  //   } else if (value === null) {
  //     comment += ` // null值`;
  //   } else if (value === undefined) {
  //     comment += ` // undefined值`;
  //   }
    
  //   return comment;
  // }

  /**
   * 从值获取类型
   * 增强的类型推断逻辑
   */
  // private getTypeFromValue(value: any): string {
  //   if (value === null) return 'null';
  //   if (value === undefined) return 'undefined';
    
  //   const type = typeof value;
    
  //   switch (type) {
  //     case 'string':
  //       // 检查是否是特殊格式的字符串
  //       if (this.isEmail(value)) return 'string'; // 可以扩展为 Email 类型
  //       if (this.isUrl(value)) return 'string'; // 可以扩展为 URL 类型
  //       if (this.isDateString(value)) return 'string'; // 可以扩展为 Date 类型
  //       if (this.isUuid(value)) return 'string'; // UUID格式
  //       if (this.isGuid(value)) return 'string'; // GUID格式
  //       return 'string';
  //     case 'number':
  //       // 检查是否是整数
  //       if (Number.isInteger(value)) return 'number';
  //       return 'number';
  //     case 'boolean':
  //       return 'boolean';
  //     case 'object':
  //       if (Array.isArray(value)) {
  //         if (value.length > 0) {
  //           const itemType = this.getTypeFromValue(value[0]);
  //           return `${itemType}[]`;
  //         }
  //         return 'any[]';
  //       }
  //       // 检查是否是空对象
  //       if (Object.keys(value).length === 0) {
  //         return 'Record<string, never>';
  //       }
  //       return 'any';
  //     default:
  //       return 'any';
  //   }
  // }

  /**
   * 检查是否是UUID格式
   */
  // private isUuid(value: string): boolean {
  //   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  //   return uuidRegex.test(value);
  // }

  /**
   * 检查是否是GUID格式
   */
  // private isGuid(value: string): boolean {
  //   const guidRegex = /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i;
  //   return guidRegex.test(value);
  // }

  /**
   * 确保属性名有效
   */
  private ensureValidPropertyName(name: string): string {
    // 如果属性名以数字开头，添加前缀
    if (/^[0-9]/.test(name)) {
      name = 'prop' + name;
    }
    
    // 如果属性名包含特殊字符，进行转义
    if (/[^a-zA-Z0-9_]/.test(name)) {
      name = `'${name}'`;
    }
    
    return name;
  }

  /**
   * 检查是否是邮箱格式
   */
  // private isEmail(value: string): boolean {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   return emailRegex.test(value);
  // }

  /**
   * 检查是否是URL格式
   */
  // private isUrl(value: string): boolean {
  //   try {
  //     new URL(value);
  //     return true;
  //   } catch {
  //     return false;
  //   }
  // }

  /**
   * 检查是否是日期字符串
   */
  // private isDateString(value: string): boolean {
  //   const date = new Date(value);
  //   return !isNaN(date.getTime());
  // }

  /**
   * 生成 API 内容
   * 增强的参数处理和错误处理，支持多种输出格式
   */
  private generateAPIContent(apiInterface: YAPIInterface): string {
    const apiName = this.generateAPIName(apiInterface);
    const interfaceName = this.generateInterfaceName(apiInterface);
    const requestInterfaceName = `${interfaceName}Params`;
    const responseInterfaceName = `${interfaceName}Response`;

    let content = '';

    if (this.config.generateComments) {
      const lines: string[] = [];
      const main = this.sanitizeComment(apiInterface.title);
      if (main) lines.push(main);
      lines.push(`请求方法: ${apiInterface.method.toUpperCase()}`);
      lines.push(`请求路径: ${apiInterface.path}`);
      content += this.toBlockComment(lines.join('\n'));
    }

    content += this.generateAPIRequestFunction(apiInterface, apiName, requestInterfaceName, responseInterfaceName);

    // 根据输出格式生成不同的API内容
    // switch (this.config.outputFormat) {
    //   case 'axios':
    //     content += this.generateAxiosAPI(apiInterface, apiName, requestInterfaceName, responseInterfaceName);
    //     break;
    //   case 'request':
    //     content += this.generateRequestAPI(apiInterface, apiName, requestInterfaceName, responseInterfaceName);
    //     break;
    //   case 'fetch':
    //   default:
    //     content += this.generateFetchAPI(apiInterface, apiName, requestInterfaceName, responseInterfaceName);
    //     break;
    // }

    return content;
  }


  /**
   * 生成 API 请求函数
   */
  /**
   * 生成类似如下的API请求函数：
   * export const xx = async (params: xxParams, config?: any) => {
   *   return get<xxResponse>('xxx', params, config);
   * };
   */
  private generateAPIRequestFunction(
    apiInterface: YAPIInterface,
    apiName: string,
    requestInterfaceName: string,
    responseInterfaceName: string
  ): string {
    const config = ConfigManager.getConfig();
    const importFunctionNames = config.importFunctionNames || DEFAULT_IMPORT_FUNCTION_NAMES;

    const method = apiInterface.method ? apiInterface.method.toLowerCase() : 'get';
    // 生成请求函数名
    const functionName = apiName;
    // 生成请求路径
    const path = apiInterface.path;
    // 生成函数内容，增加 config 参数
    return `export const ${functionName} = async (params: ${requestInterfaceName}, config?: ${method === 'get' ? getConfigTypeName(importFunctionNames[0]) : getConfigTypeName(importFunctionNames[1])}) => {
  return ${method === 'get' ? importFunctionNames[0] : importFunctionNames[1]}<${responseInterfaceName}>('${path}', params, config);
};`;
  }

  /**
   * 生成 Fetch API
   */
  // private generateFetchAPI(apiInterface: YAPIInterface, apiName: string, requestInterfaceName: string, responseInterfaceName: string): string {
  //   let content = `export const ${apiName} = async (params: ${requestInterfaceName}): Promise<${responseInterfaceName}> => {\n`;
    
  //   // 构建请求URL
  //   content += `  // 构建请求URL\n`;
  //   content += `  let url = \`${this.config.baseURL || ''}${apiInterface.path}\`;\n`;
    
  //   // 处理GET请求的查询参数
  //   if (apiInterface.method.toUpperCase() === 'GET') {
  //     content += `  \n`;
  //     content += `  // GET 请求参数处理\n`;
  //     content += `  const queryParams = new URLSearchParams();\n`;
      
  //     if (apiInterface.req_query && apiInterface.req_query.length > 0) {
  //       content += `  \n`;
  //       content += `  // 添加查询参数\n`;
  //       for (const param of apiInterface.req_query) {
  //         const isRequired = param.required === '1';
  //         if (isRequired) {
  //           content += `  if (params.${param.name} !== undefined) {\n`;
  //           content += `    queryParams.append('${param.name}', String(params.${param.name}));\n`;
  //           content += `  }\n`;
  //         } else {
  //           content += `  if (params.${param.name} !== undefined) {\n`;
  //           content += `    queryParams.append('${param.name}', String(params.${param.name}));\n`;
  //           content += `  }\n`;
  //         }
  //       }
  //     }
      
  //     content += `  \n`;
  //     content += `  // 构建完整URL\n`;
  //     content += `  const queryString = queryParams.toString();\n`;
  //     content += `  if (queryString) {\n`;
  //     content += `    url += '?' + queryString;\n`;
  //     content += `  }\n`;
  //   }
    
  //   content += `  \n`;
  //   content += `  // 构建请求配置\n`;
  //   content += `  const requestConfig: RequestInit = {\n`;
  //   content += `    method: '${apiInterface.method.toUpperCase()}',\n`;
  //   content += `    headers: {\n`;
  //   content += `      'Content-Type': 'application/json',\n`;
  //   content += `      'Accept': 'application/json',\n`;
  //   content += `    },\n`;
    
  //   // 处理非GET请求的请求体
  //   if (apiInterface.method.toUpperCase() !== 'GET') {
  //     content += `    body: JSON.stringify(params),\n`;
  //   }
    
  //   content += `  };\n`;
  //   content += `  \n`;
  //   content += `  try {\n`;
  //   content += `    const response = await fetch(url, requestConfig);\n`;
  //   content += `    \n`;
  //   content += `    if (!response.ok) {\n`;
  //   content += `      throw new Error(\`HTTP error! status: \${response.status}, message: \${response.statusText}\`);\n`;
  //   content += `    }\n`;
  //   content += `    \n`;
  //   content += `    const data = await response.json();\n`;
  //   content += `    return data as ${responseInterfaceName};\n`;
  //   content += `  } catch (error) {\n`;
  //   content += `    console.error('API请求失败:', error);\n`;
  //   content += `    throw error;\n`;
  //   content += `  }\n`;
  //   content += `};\n`;

  //   return content;
  // }

  /**
   * 生成 Axios API
   */
  // private generateAxiosAPI(apiInterface: YAPIInterface, apiName: string, requestInterfaceName: string, responseInterfaceName: string): string {
  //   let content = `export const ${apiName} = async (params: ${requestInterfaceName}): Promise<${responseInterfaceName}> => {\n`;
    
  //   content += `  try {\n`;
  //   content += `    const response = await axios.${apiInterface.method.toLowerCase()}(\n`;
  //   content += `      \`${this.config.baseURL || ''}${apiInterface.path}\`,\n`;
    
  //   if (apiInterface.method.toUpperCase() === 'GET') {
  //     content += `      { params }\n`;
  //   } else {
  //     content += `      params\n`;
  //   }
    
  //   content += `    );\n`;
  //   content += `    return response.data;\n`;
  //   content += `  } catch (error) {\n`;
  //   content += `    console.error('API请求失败:', error);\n`;
  //   content += `    throw error;\n`;
  //   content += `  }\n`;
  //   content += `};\n`;

  //   return content;
  // }

  /**
   * 生成 Request API
   */
  // private generateRequestAPI(apiInterface: YAPIInterface, apiName: string, requestInterfaceName: string, responseInterfaceName: string): string {
  //   let content = `export const ${apiName} = async (params: ${requestInterfaceName}): Promise<${responseInterfaceName}> => {\n`;
    
  //   content += `  try {\n`;
  //   content += `    const response = await request({\n`;
  //   content += `      url: \`${this.config.baseURL || ''}${apiInterface.path}\`,\n`;
  //   content += `      method: '${apiInterface.method.toUpperCase()}',\n`;
  //   content += `      headers: {\n`;
  //   content += `        'Content-Type': 'application/json',\n`;
  //   content += `      },\n`;
    
  //   if (apiInterface.method.toUpperCase() === 'GET') {
  //     content += `      qs: params,\n`;
  //   } else {
  //     content += `      body: params,\n`;
  //   }
    
  //   content += `      json: true,\n`;
  //   content += `      timeout: ${this.config.timeout},\n`;
  //   content += `    });\n`;
  //   content += `    return response;\n`;
  //   content += `  } catch (error) {\n`;
  //   content += `    console.error('API请求失败:', error);\n`;
  //   content += `    throw error;\n`;
  //   content += `  }\n`;
  //   content += `};\n`;

  //   return content;
  // }
}
