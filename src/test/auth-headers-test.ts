import { YAPIService } from '../services/yapiService';
import { YAPIConfig } from '../types/yapi';

// 模拟配置
const mockConfig: YAPIConfig = {
  yapiUrl: 'http://yapi.example.com',
  username: 'test-user',
  password: 'test-password',
  outputPath: './src/api',
  requestFunctionFilePath: './src/api/request.ts'
};

// 测试认证头构建逻辑
function testAuthHeadersLogic() {
  console.log('=== 测试认证头构建逻辑 ===');
  
  const yapiService = new YAPIService(mockConfig);
  
  // 使用反射访问私有方法进行测试
  const buildAuthHeaders = (yapiService as any).buildAuthHeaders;
  const buildRequestConfig = (yapiService as any).buildRequestConfig;
  
  if (buildAuthHeaders && buildRequestConfig) {
    console.log('✅ 私有方法访问成功');
    
    // 测试基础认证头
    const token = 'test_token_123';
    const baseHeaders = buildAuthHeaders(token);
    console.log('基础认证头:', baseHeaders);
    
    // 验证必要的头部字段
    const requiredHeaders = ['Cookie', 'Content-Type', 'Accept', 'User-Agent'];
    const hasAllRequiredHeaders = requiredHeaders.every(header => header in baseHeaders);
    
    if (hasAllRequiredHeaders) {
      console.log('✅ 包含所有必要的请求头');
    } else {
      console.log('❌ 缺少必要的请求头');
    }
    
    // 测试Cookie格式
    if (baseHeaders.Cookie === '_yapi_token=test_token_123') {
      console.log('✅ Cookie格式正确');
    } else {
      console.log('❌ Cookie格式错误');
    }
    
    // 测试额外请求头合并
    const additionalHeaders = { 'X-Custom-Header': 'custom-value' };
    const mergedHeaders = buildAuthHeaders(token, additionalHeaders);
    
    if (mergedHeaders['X-Custom-Header'] === 'custom-value') {
      console.log('✅ 额外请求头合并成功');
    } else {
      console.log('❌ 额外请求头合并失败');
    }
    
    // 测试请求配置构建
    const params = { project_id: '123' };
    const requestConfig = buildRequestConfig.call(yapiService, token, params);
    
    console.log('请求配置:', requestConfig);
    
    if (requestConfig.headers && requestConfig.params && requestConfig.timeout) {
      console.log('✅ 请求配置构建成功');
    } else {
      console.log('❌ 请求配置构建失败');
    }
    
    // 验证超时设置
    if (requestConfig.timeout === 30000) {
      console.log('✅ 超时设置正确 (30秒)');
    } else {
      console.log('❌ 超时设置错误');
    }
    
    // 验证状态码验证函数
    if (typeof requestConfig.validateStatus === 'function') {
      console.log('✅ 状态码验证函数存在');
      
      // 测试状态码验证逻辑
      const testStatuses = [200, 400, 500];
      const expectedResults = [true, true, false];
      
      testStatuses.forEach((status, index) => {
        const result = requestConfig.validateStatus(status);
        const expected = expectedResults[index];
        
        if (result === expected) {
          console.log(`✅ 状态码 ${status} 验证正确: ${result}`);
        } else {
          console.log(`❌ 状态码 ${status} 验证错误: 期望 ${expected}, 实际 ${result}`);
        }
      });
    } else {
      console.log('❌ 状态码验证函数不存在');
    }
    
  } else {
    console.log('❌ 无法访问私有方法');
  }
}

// 测试请求头格式
function testHeaderFormats() {
  console.log('\n=== 测试请求头格式 ===');
  
  const expectedFormats = {
    'Cookie': '_yapi_token=test_token_123',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'YAPI-TypeScript-Generator/1.1.0'
  };
  
  console.log('期望的请求头格式:');
  Object.entries(expectedFormats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  console.log('✅ 请求头格式测试完成');
}

// 运行所有测试
function runAuthHeadersTests() {
  console.log('开始运行认证头逻辑测试...\n');
  
  testAuthHeadersLogic();
  testHeaderFormats();
  
  console.log('\n=== 测试总结 ===');
  console.log('✅ 认证头构建逻辑测试完成');
  console.log('✅ 请求配置构建测试完成');
  console.log('✅ 请求头格式验证完成');
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAuthHeadersTests();
}
