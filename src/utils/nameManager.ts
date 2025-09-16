import pinyin from 'pinyin';

/**
 * 名称管理器类，支持多种命名格式转换
 */
export class NameManager {
  private originalName: string;
  private pinyinName: string;

  constructor(name: string) {
    this.originalName = name;
    this.pinyinName = this.convertChineseToPinyin(name);
  }

  /**
   * 转换为小驼峰命名 (camelCase)
   * 例: hello_world -> helloWorld
   */
  toCamelCase(): string {
    const name = this.pinyinName;
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ') // 替换特殊字符为空格
      .split(' ')
      .filter(word => word.length > 0)
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * 转换为大驼峰命名 (PascalCase)
   * 例: hello_world -> HelloWorld
   */
  toPascalCase(): string {
    const name = this.pinyinName;
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ') // 替换特殊字符为空格
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * 转换为蛇形命名 (snake_case)
   * 例: HelloWorld -> hello_world
   */
  toSnakeCase(): string {
    const name = this.pinyinName;
    return name
      .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
      .replace(/[^a-zA-Z0-9]/g, ' ') // 替换特殊字符为空格
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase())
      .join('_');
  }

  /**
   * 转换为短横线命名 (kebab-case)
   * 例: HelloWorld -> hello-world
   */
  toKebabCase(): string {
    const name = this.pinyinName;
    return name
      .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
      .replace(/[^a-zA-Z0-9]/g, ' ') // 替换特殊字符为空格
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase())
      .join('-');
  }

  /**
   * 获取原始名称
   */
  getOriginalName(): string {
    return this.originalName;
  }

  /**
   * 获取拼音转换后的名称
   */
  getPinyinName(): string {
    return this.pinyinName;
  }

  /**
   * 中文转拼音实现，参考 terminalService.ts 中的实现
   * 使用 pinyin 库进行转换，保持字符间分隔以便后续格式转换
   */
  private convertChineseToPinyin(text: string): string {
    return text.replace(/[\u4e00-\u9fa5]/g, (match) => {
      const pinyinResult = pinyin(match, { style: 'NORMAL' });
      // 将每个字符的拼音用空格分隔，这样后续转换时能识别单字边界
      return ' ' + pinyinResult.map(item => item.join('')).join(' ') + ' ';
    }).replace(/\s+/g, ' ').trim(); // 清理多余空格
  }

  /**
   * 获取所有格式的转换结果
   */
  getAllFormats(): {
    original: string;
    pinyin: string;
    camelCase: string;
    pascalCase: string;
    snakeCase: string;
    kebabCase: string;
  } {
    return {
      original: this.getOriginalName(),
      pinyin: this.getPinyinName(),
      camelCase: this.toCamelCase(),
      pascalCase: this.toPascalCase(),
      snakeCase: this.toSnakeCase(),
      kebabCase: this.toKebabCase()
    };
  }
}

// 使用示例：
// const nameManager = new NameManager('用户管理');
// console.log(nameManager.toCamelCase()); // 'yongHuGuanLi'
// console.log(nameManager.toPascalCase()); // 'YongHuGuanLi'
// console.log(nameManager.toSnakeCase()); // 'yong_hu_guan_li'
// console.log(nameManager.toKebabCase()); // 'yong-hu-guan-li'