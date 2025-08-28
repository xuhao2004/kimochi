#!/usr/bin/env node

/**
 * kimochi心晴 - 第三方API服务测试脚本
 * 用于验证所有配置的第三方API服务是否正常工作
 */

const https = require('https');
const http = require('http');
const zlib = require('zlib');
const nodemailer = require('nodemailer');

// 颜色输出
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.purple}[TEST]${colors.reset} ${msg}`)
};

// HTTP请求工具（支持gzip解压缩）
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        
        // 添加Accept-Encoding头支持压缩
        if (!options.headers) options.headers = {};
        options.headers['Accept-Encoding'] = 'gzip, deflate, br';
        
        const req = client.request(url, options, (res) => {
            let chunks = [];
            
            // 处理压缩响应
            let stream = res;
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            } else if (encoding === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            }
            
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
            stream.on('error', reject);
        });
        
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// 测试结果统计
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
};

function recordTest(passed, skipped = false) {
    testResults.total++;
    if (skipped) {
        testResults.skipped++;
    } else if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// 1. 测试SMTP邮件服务
async function testSMTPService() {
    log.step('测试SMTP邮件服务...');
    
    try {
        const {
            SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
            SMTP_REQUIRE_TLS, SMTP_FROM
        } = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            log.warning('SMTP配置不完整，跳过测试');
            recordTest(false, true);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT) || 465,
            secure: parseInt(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            tls: {
                rejectUnauthorized: SMTP_REQUIRE_TLS === '1'
            }
        });

        // 验证连接
        await transporter.verify();
        log.success(`✅ SMTP连接成功: ${SMTP_HOST}:${SMTP_PORT}`);
        log.info(`   账号: ${SMTP_USER}`);
        recordTest(true);

    } catch (error) {
        log.error(`❌ SMTP测试失败: ${error.message}`);
        recordTest(false);
    }
}

// 2. 测试DeepSeek AI服务
async function testDeepSeekAPI() {
    log.step('测试DeepSeek AI服务...');
    
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            log.warning('DeepSeek API Key未配置，跳过测试');
            recordTest(false, true);
            return;
        }

        const response = await makeRequest('https://api.deepseek.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.statusCode === 200) {
            const data = JSON.parse(response.data);
            log.success('✅ DeepSeek API连接成功');
            log.info(`   可用模型数量: ${data.data ? data.data.length : '未知'}`);
            recordTest(true);
        } else {
            log.error(`❌ DeepSeek API测试失败，状态码: ${response.statusCode}`);
            recordTest(false);
        }

    } catch (error) {
        log.error(`❌ DeepSeek API测试失败: ${error.message}`);
        recordTest(false);
    }
}

// 3. 测试和风天气API
async function testQWeatherAPI() {
    log.step('测试和风天气API服务...');
    
    try {
        const {
            HEWEATHER_API_KEY,
            QWEATHER_GATEWAY_BASE
        } = process.env;
        
        if (!HEWEATHER_API_KEY) {
            log.warning('和风天气API Key未配置，跳过测试');
            recordTest(false, true);
            return;
        }

        const baseUrl = QWEATHER_GATEWAY_BASE || 'devapi.qweather.com';
        const testUrl = `https://${baseUrl}/v7/weather/now?location=101010100&key=${HEWEATHER_API_KEY}`;

        const response = await makeRequest(testUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; kimochi/1.0)',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        });

        if (response.statusCode === 200) {
            try {
                // 检查响应数据是否为空
                if (!response.data || response.data.trim() === '') {
                    log.error('❌ 和风天气API返回空响应');
                    recordTest(false);
                    return;
                }
                
                const data = JSON.parse(response.data);
                if (data.code === '200') {
                    log.success('✅ 和风天气API连接成功');
                    log.info(`   测试城市: 北京`);
                    log.info(`   当前天气: ${data.now ? data.now.text : '获取成功'}`);
                    recordTest(true);
                } else {
                    log.error(`❌ 和风天气API返回错误: ${data.code} - ${data.refer || '未知错误'}`);
                    log.info(`   响应内容: ${response.data.substring(0, 200)}`);
                    recordTest(false);
                }
            } catch (parseError) {
                log.error(`❌ 和风天气API响应解析失败: ${parseError.message}`);
                log.info(`   原始响应: ${response.data.substring(0, 200)}`);
                recordTest(false);
            }
        } else {
            log.error(`❌ 和风天气API测试失败，状态码: ${response.statusCode}`);
            log.info(`   响应内容: ${response.data.substring(0, 200)}`);
            recordTest(false);
        }

    } catch (error) {
        log.error(`❌ 和风天气API测试失败: ${error.message}`);
        recordTest(false);
    }
}

// 4. 测试高德地图API
async function testAmapAPI() {
    log.step('测试高德地图API服务...');
    
    try {
        const apiKey = process.env.AMAP_API_KEY;
        
        if (!apiKey) {
            log.warning('高德地图API Key未配置，跳过测试');
            recordTest(false, true);
            return;
        }

        // 使用高德地图静态API测试（无需签名）
        const testUrl = `https://restapi.amap.com/v3/geocode/regeo?location=116.397428,39.90923&key=${apiKey}&radius=1000&extensions=all`;

        const response = await makeRequest(testUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; kimochi/1.0)'
            }
        });

        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.data);
                if (data.status === '1') {
                    log.success('✅ 高德地图API连接成功');
                    const regeocode = data.regeocode;
                    if (regeocode && regeocode.formatted_address) {
                        log.info(`   逆地理编码测试: ${regeocode.formatted_address}`);
                    } else {
                        log.info('   API响应: 逆地理编码查询成功');
                    }
                    recordTest(true);
                } else {
                    log.error(`❌ 高德地图API返回错误: ${data.info || data.infocode}`);
                    log.info(`   错误代码: ${data.infocode}`);
                    
                    // 提供具体的错误建议
                    if (data.infocode === '10001') {
                        log.warning('   💡 建议: API密钥不存在或过期，请检查AMAP_API_KEY配置');
                    } else if (data.infocode === '10002') {
                        log.warning('   💡 建议: 没有权限使用相应的服务或者请求接口的路径拼写错误');
                    } else if (data.infocode === '10003') {
                        log.warning('   💡 建议: 访问已超出日访问量，请升级API配额');
                    } else {
                        log.warning('   💡 建议: 请检查API密钥权限或联系高德客服');
                    }
                    recordTest(false);
                }
            } catch (parseError) {
                log.error(`❌ 高德地图API响应解析失败: ${parseError.message}`);
                log.info(`   原始响应: ${response.data.substring(0, 200)}`);
                recordTest(false);
            }
        } else {
            log.error(`❌ 高德地图API测试失败，状态码: ${response.statusCode}`);
            log.info(`   响应内容: ${response.data.substring(0, 200)}`);
            recordTest(false);
        }

    } catch (error) {
        log.error(`❌ 高德地图API测试失败: ${error.message}`);
        recordTest(false);
    }
}

// 5. 测试微信小程序配置
async function testWechatAPI() {
    log.step('测试微信小程序配置...');
    
    try {
        const {
            WEAPP_APP_ID,
            WEAPP_APP_SECRET
        } = process.env;
        
        if (!WEAPP_APP_ID || !WEAPP_APP_SECRET) {
            log.warning('微信小程序配置不完整，跳过测试');
            recordTest(false, true);
            return;
        }

        // 获取access_token测试配置
        const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WEAPP_APP_ID}&secret=${WEAPP_APP_SECRET}`;

        const response = await makeRequest(tokenUrl, {
            method: 'GET'
        });

        if (response.statusCode === 200) {
            const data = JSON.parse(response.data);
            if (data.access_token) {
                log.success('✅ 微信小程序API连接成功');
                log.info(`   AppID: ${WEAPP_APP_ID}`);
                log.info(`   Token获取: 成功`);
                recordTest(true);
            } else {
                log.error(`❌ 微信小程序API返回错误: ${data.errmsg || '未知错误'}`);
                recordTest(false);
            }
        } else {
            log.error(`❌ 微信小程序API测试失败，状态码: ${response.statusCode}`);
            recordTest(false);
        }

    } catch (error) {
        log.error(`❌ 微信小程序API测试失败: ${error.message}`);
        recordTest(false);
    }
}

// 主函数
async function main() {
    console.log('');
    console.log('🚀 kimochi心晴 - 第三方API服务测试');
    console.log('='.repeat(50));
    console.log('');

    // 执行所有测试
    await testSMTPService();
    console.log('');
    
    await testDeepSeekAPI();
    console.log('');
    
    await testQWeatherAPI();
    console.log('');
    
    await testAmapAPI();
    console.log('');
    
    await testWechatAPI();
    console.log('');

    // 显示测试结果摘要
    console.log('='.repeat(50));
    console.log('📊 测试结果摘要:');
    console.log(`   总计: ${testResults.total} 项测试`);
    console.log(`   ✅ 通过: ${colors.green}${testResults.passed}${colors.reset}`);
    console.log(`   ❌ 失败: ${colors.red}${testResults.failed}${colors.reset}`);
    console.log(`   ⏭️  跳过: ${colors.yellow}${testResults.skipped}${colors.reset}`);
    
    const successRate = testResults.total > 0 ? 
        Math.round((testResults.passed / (testResults.total - testResults.skipped)) * 100) : 0;
    console.log(`   📈 成功率: ${successRate}%`);
    
    console.log('='.repeat(50));

    if (testResults.failed > 0) {
        console.log('');
        log.warning('部分API测试失败，请检查配置或网络连接');
        process.exit(1);
    } else {
        console.log('');
        log.success('🎉 所有配置的API服务测试通过！');
        process.exit(0);
    }
}

// 运行测试
if (require.main === module) {
    main().catch(error => {
        log.error(`测试执行失败: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { 
    testSMTPService, 
    testDeepSeekAPI, 
    testQWeatherAPI, 
    testAmapAPI, 
    testWechatAPI 
};
