// YAPI 接口相关类型定义

export interface YAPIResponse<T> {
  errcode: number;
  errmsg: string;
  data: T;
}

export interface YAPIConfig {
  /**
   * YAPI 服务器地址
   */
  yapiUrl: string;
  /**
   * YAPI 用户名
   */
  username: string;
  /**
   * YAPI 密码
   */
  password: string;
  /**
   * 生成的 TypeScript 文件输出路径
   */
  outputPath: string;
  /**
   * 请求函数文件路径 如 'src/api/request.ts'
   */
  requestFunctionFilePath: string;
  /**
   * 导入的函数名称 如 ['get', 'post']  import { get, post } from 'requestFunctionFilePath'
   * 如果不配置 默认导入 ['get', 'post'] 
   * 第一个传入getFunctionName 第二个传入postFunctionName
   */
  importFunctionNames?: string[];
}

export interface YAPIInterface {
  _id: number;
  title: string;
  path: string;
  method: string;
  desc: string;
  req_params: [];
  req_query: YAPIParam[];
  req_headers: [];
  req_body_form: YAPIParam[];
  req_body_type: string;
  res_body: string;
  res_body_type: string;
  res_body_is_json_schema: boolean;
  catid: number;
  status: string;
  add_time: number;
  up_time: number;
  index: number;
  uid: number;
  username: string;
  project_id: number;
  edit_uid: number;
  edit_username: string;
  edit_time: number;
  del_uid: number;
  del_username: string;
  del_time: number;
  __v: number;
  req_body_other: string;
}

export interface YAPIParam {
  /** 参数名，例如 "date_type" */
  name: string; 
  /** 是否必填，"1" 表示必填  "0" 表示非必填*/
  required: string;    
  /** 描述，例如 "2是周  3是月" */
  desc: string;        
  /** 示例值，例如 "3" */
  example: string;     
  /** 参数唯一标识 */
  _id: string;         
}

export interface YAPIHeader {
  name: string;
  value: string;
  required: string;
  desc: string;
  example: string;
}

export interface YAPIGroup {
  _id: number;
  group_name: string;
  role: string;
  type: string;
  add_time: number;
  up_time: number;
  custom_field1?: {
    enable: boolean;
  };

}

export interface YAPIProject {
  _id: number;
  name: string;
  basepath: string;
  color: string;
  icon: string;
  project_type: string;
  group_id: number;
  add_time: number;
  up_time: number;
  uid: number;
  follow: boolean;
  switch_notice: boolean;
  env: {
    domain: string;
    global: any[];
    header: any[];
    name: string;
    _id: string;
  }[];
}

export interface YAPIMenuList {
  _id: number;
  name: string;
  desc: string;
  index: number;
  add_time: number;
  up_time: number;
  __v: number;
  project_id: number;
  uid: number;
  list: {
    add_time: number;
    catid: number;
    edit_uid: number;
    index: number;
    method: string;
    path: string;
    project_id: number;
    status: string;
    tag: string[];
    title: string;
    uid: number;
    up_time: number;
    _id: number;
  }[];

}


export interface GeneratedInterface {
  name: string;
  content: string;
}

export interface GeneratedAPI {
  name: string;
  content: string;
}
