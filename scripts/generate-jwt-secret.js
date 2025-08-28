#!/usr/bin/env node

/**
 * JWT Secret 生成器
 * 为kimochi心晴项目生成安全的JWT密钥
 */

const crypto = require('crypto');

function generateJWTSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function main() {
    const secret = generateJWTSecret();
    
    console.log('='.repeat(60));
    console.log('kimochi心晴 - JWT Secret 生成器');
    console.log('='.repeat(60));
    console.log('\n生成的JWT密钥:');
    console.log(secret);
    console.log('\n请将此密钥复制到你的环境配置文件中:');
    console.log('JWT_SECRET="' + secret + '"');
    console.log('\n⚠️  重要提示:');
    console.log('- 请妥善保管此密钥，不要泄露给任何人');
    console.log('- 在生产环境中更换此密钥将导致所有现有token失效');
    console.log('- 建议定期更换JWT密钥以提高安全性');
    console.log('='.repeat(60));
}

if (require.main === module) {
    main();
}

module.exports = { generateJWTSecret };