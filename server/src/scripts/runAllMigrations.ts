import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
    'initDb.js',
    'migrateTemplates.js',
    'migratePhase1.js',
    'migrateSocial.js',
    'migrateFeedbackReply.js',
    'migrateVideoExport.js',
    'migrateUnifiedAssets.js',
    'seedTemplates.js',
    'seedThemes.js'
];

async function runAll() {
    console.log('========================================');
    console.log('🚀 开始执行 TimeCollate 全量数据库建表与迁移...');
    console.log('========================================');

    for (const script of scripts) {
        const scriptPath = path.join(__dirname, script);
        console.log(`\n👉 正在执行脚本: ${script}...`);
        
        try {
            // 在生产环境中直接使用 node 运行编译后的 JS 文件
            execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
            console.log(`✅ 脚本 ${script} 执行成功`);
        } catch (error) {
            console.error(`❌ 脚本 ${script} 执行失败`);
            process.exit(1);
        }
    }

    console.log('\n========================================');
    console.log('🎉 恭喜！全量数据库初始化与数据灌入成功！');
    console.log('========================================');
}

runAll();
