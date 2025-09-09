import axios from 'axios';
import { YAPIConfig, YAPIInterface, YAPIGroup, YAPIResponse, YAPIProject, YAPIMenuList } from '../types/yapi';
import { YAPI_COOKIE_NAMES } from '../constants';

export class YAPIService {
  private config: YAPIConfig;
  private token: string | null = null;
  private uid: string | null = null;
  private axiosInstance: ReturnType<typeof axios.create>;

  constructor(config: YAPIConfig) {
    this.config = config;
    // 创建axios实例，用于处理cookie
    this.axiosInstance = axios.create({
      withCredentials: true
    });
  }

  /**
   * 登录 YAPI 获取访问令牌
   */
  async login(): Promise<{ token: string, uid: string }> {
    try {
      
      const response = await this.axiosInstance.post(`${this.config.yapiUrl}/api/user/login`, {
        email: this.config.username,
        password: this.config.password
      });

      if (response.data.errcode === 0) {
        // 从响应头中获取Set-Cookie
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          // 解析cookie获取_yapi_token
          const { token: yapiToken, uid: yapiUid } = this.extractYapiTokenFromCookies(setCookieHeader);
          if (yapiToken && yapiUid) {
            this.token = yapiToken;
            this.uid = yapiUid;
              return {token: yapiToken, uid: yapiUid};
          }
        }
             
        throw new Error('登录成功但未获取到访问令牌');
      } else {
        console.log('response.data',response.data);
        throw new Error(`登录失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`登录请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建认证请求头
   */
  private buildAuthHeaders(config: { token: string, uid: string }, additionalHeaders?: Record<string, string>): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      'Cookie': `${YAPI_COOKIE_NAMES.TOKEN}=${config.token};${YAPI_COOKIE_NAMES.UID}=${config.uid}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'YAPI-TypeScript-Generator/1.1.0'
    };

    // 合并额外的请求头
    if (additionalHeaders) {
      return { ...baseHeaders, ...additionalHeaders };
    }

    return baseHeaders;
  }

  /**
   * 构建请求配置
   */
  private buildRequestConfig(cookieConfig: { token: string, uid: string }, params?: Record<string, any>, additionalHeaders?: Record<string, string>) {
    return {
      headers: this.buildAuthHeaders(cookieConfig, additionalHeaders),
      params,
      timeout: 30000, // 30秒超时
      validateStatus: (status: number) => status < 500 // 只对5xx错误抛出异常
    };
  }

  /**
   * 从Set-Cookie头中提取_yapi_token
   */
  private extractYapiTokenFromCookies(setCookieHeaders: string[]): { token: string | null, uid: string | null } {
    let yapiToken: string | null = null;
    let yapiUid: string | null = null;
    for (const cookieHeader of setCookieHeaders) {
      const cookies = cookieHeader.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === YAPI_COOKIE_NAMES.TOKEN && value) {
          yapiToken = value;
          // 继续查找，取最后一个匹配的token
        }
        if (name === YAPI_COOKIE_NAMES.UID && value) {
          yapiUid = value;
          // 继续查找，取最后一个匹配的uid
        }
      }
    }
    return { token: yapiToken, uid: yapiUid };
  }

  /**
   * 获取访问令牌（如果未登录则先登录）
   */
  private async getToken(): Promise<{ token: string, uid: string }> {
    if (!this.token || !this.uid) {
      await this.login();
    }
    if (!this.token || !this.uid) {
      throw new Error('无法获取访问令牌');
    }
    return { token: this.token, uid: this.uid };
  }

  /**
   * 获取分组列表
   */
  async getGroups(): Promise<YAPIGroup[]> {
    try {
      const cookieConfig = await this.getToken();
      
      const response = await this.axiosInstance.get<YAPIResponse<YAPIGroup[]>>(
        `${this.config.yapiUrl}/api/group/list`,
        this.buildRequestConfig(cookieConfig)
      );

      if (response.data.errcode === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取分组失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`请求分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

   /**
   * 获取分组下的项目列表
   */
   async getProjects(groupId: number): Promise<YAPIProject[]> {
    try {
      const cookieConfig = await this.getToken();
      const response = await this.axiosInstance.get<YAPIResponse<{list: YAPIProject[]} >>(
        `${this.config.yapiUrl}/api/project/list`,
        this.buildRequestConfig(cookieConfig, { group_id: groupId,page:1,limit:100
        })
      );
      if (response.data.errcode === 0) {
        return response.data.data?.list || [];
      } else {
        throw new Error(`获取项目列表失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`请求项目列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取项目详情菜单列表
   */
  async getProjectDetailMenuList(projectId: number): Promise<YAPIMenuList[]> {
    try {
      const cookieConfig = await this.getToken();
      const response = await this.axiosInstance.get<YAPIResponse<YAPIMenuList[]>>(
        `${this.config.yapiUrl}/api/interface/list_menu`,
          this.buildRequestConfig(cookieConfig, { project_id: projectId, })
      );
      if (response.data.errcode === 0) {
        return response.data.data || [];
      } else {
        throw new Error(`获取项目详情菜单列表失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`请求项目详情菜单列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取接口详情数据
   */
  async getInterfaces(id: number): Promise<YAPIInterface> {
    try {
      const cookieConfig = await this.getToken();
      const response = await this.axiosInstance.get<YAPIResponse<YAPIInterface>>(
        `${this.config.yapiUrl}/api/interface/get`,
        this.buildRequestConfig(cookieConfig, { id: id })
      );

      if (response.data.errcode === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取接口列表失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`请求接口列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取单个接口详情
   */
  async getInterfaceDetail(interfaceId: number): Promise<YAPIInterface> {
    try {
      const cookieConfig = await this.getToken();
      const response = await this.axiosInstance.get<YAPIResponse<YAPIInterface>>(
        `${this.config.yapiUrl}/api/interface/get`,
        this.buildRequestConfig(cookieConfig, { id: interfaceId })
      );

      if (response.data.errcode === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取接口详情失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      throw new Error(`请求接口详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }


  /**
   * 获取项目下的所有接口
   */
  async getAllInterfaces(): Promise<YAPIGroup[]> {
    try {
      const groups = await this.getGroups();
      // console.log('groups',groups);
      // const allInterfaces: YAPIInterface[] = [];

      // for (const category of categories) {
      //   const interfaces = await this.getInterfaces(category._id);
      //   allInterfaces.push(...interfaces);
      // }

      return groups;
    } catch (error) {
      throw new Error(`获取所有接口失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}
