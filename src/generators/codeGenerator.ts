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
   * 规则：去掉HTTP方法前缀，转换为PascalCase格式
   * 例如：getPartnerRankShareUrl -> PartnerRankShareUrl
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
   * 规则：取接口请求类型拼接URL最后一段，去掉拼接id的逻辑，保持原有驼峰格式
   * 例如：GET /api/AffiliatePartner/getPartnerRankShareUrl -> getPartnerRankShareUrl
   * 例如：GET /api/shop/sShopList -> getSShopList
   */
  private generateAPIName(apiInterface: YAPIInterface): string {
    const path = apiInterface.path;
    // 拆分路径，去除空字符串
    const paths = path.split('/').filter(Boolean);

    // 只取最后1个路径段
    const lastPath = paths.length > 0 ? paths[paths.length - 1] : '';

    // 处理路径段，转为驼峰命名（保持原有驼峰格式）
    const processedPath = lastPath
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) // 处理连字符
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) // 处理下划线
    .replace(/[^a-zA-Z0-9]/g, '') // 移除特殊字符
    .replace(/^[0-9]/, '') // 移除开头的数字
    .replace(/^./, str => str.toUpperCase()); // 首字母大写

    // 方法前缀
    const methodName = this.config.methodNamePrefix[apiInterface.method.toUpperCase()].toLocaleLowerCase() || 'get';

    // 拼接方法前缀和路径
    return methodName + processedPath;
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
    } catch (error) {
      console.warn('生成对象接口失败:', error);
      content += `${indent}// 类型推断失败，使用 any\n`;
      content += `${indent}[key: string]: any;\n`;
    }

    return content;
  }

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

}
