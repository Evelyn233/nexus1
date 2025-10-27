const https = require('https');

async function testVercelAPI() {
  const baseUrl = 'https://inflow-nu.vercel.app';
  
  console.log('🔍 测试 Vercel API 端点...');
  
  // 测试健康检查
  try {
    console.log('1. 测试健康检查...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 健康检查通过:', healthData);
    } else {
      console.log('❌ 健康检查失败:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ 健康检查错误:', error.message);
  }
  
  // 测试用户信息 API
  try {
    console.log('2. 测试用户信息 API...');
    const userResponse = await fetch(`${baseUrl}/api/user/info`);
    console.log('📊 用户信息 API 状态:', userResponse.status);
    
    if (userResponse.status === 401) {
      console.log('ℹ️ 用户信息 API 需要认证（正常）');
    } else if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ 用户信息 API 响应:', userData);
    } else {
      const errorText = await userResponse.text();
      console.log('❌ 用户信息 API 错误:', errorText);
    }
  } catch (error) {
    console.log('❌ 用户信息 API 错误:', error.message);
  }
  
  // 测试 NextAuth API
  try {
    console.log('3. 测试 NextAuth API...');
    const authResponse = await fetch(`${baseUrl}/api/auth/providers`);
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ NextAuth API 正常:', Object.keys(authData));
    } else {
      console.log('❌ NextAuth API 失败:', authResponse.status);
    }
  } catch (error) {
    console.log('❌ NextAuth API 错误:', error.message);
  }
  
  // 测试数据库连接
  try {
    console.log('4. 测试数据库连接...');
    const dbResponse = await fetch(`${baseUrl}/api/user/metadata`);
    console.log('📊 数据库 API 状态:', dbResponse.status);
    
    if (dbResponse.status === 401) {
      console.log('ℹ️ 数据库 API 需要认证（正常）');
    } else if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log('✅ 数据库 API 响应:', dbData);
    } else {
      const errorText = await dbResponse.text();
      console.log('❌ 数据库 API 错误:', errorText);
    }
  } catch (error) {
    console.log('❌ 数据库 API 错误:', error.message);
  }
}

testVercelAPI().catch(console.error);
