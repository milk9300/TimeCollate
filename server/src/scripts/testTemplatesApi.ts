import { templateService } from '../services/TemplateService.js';
import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

async function testApiAndDb() {
    console.log('🧪 开始进行动态模板的自动化接口与数据库校验...');

    // 1. 验证数据库连接与模板表存在性
    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        ssl: config.mysql.ssl
    });

    try {
        const [tables] = await connection.query<any[]>(
            "SHOW TABLES LIKE 'book_templates'"
        );
        if (tables.length === 0) {
            throw new Error("❌ book_templates 表不存在！");
        }
        console.log('✅ 1. 确认 book_templates 关系表已正确创建。');

        const [columnInfo] = await connection.query<any[]>(
            "SHOW COLUMNS FROM pages LIKE 'layout'"
        );
        console.log(`✅ 2. 确认 pages 表 layout 字段类型为: ${columnInfo[0].Type}`);

        // 2. 调用 TemplateService 验证数据提取
        const templates = await templateService.getTemplates();
        console.log(`✅ 3. 从数据库成功拉取到 ${templates.length} 个动态模板。`);

        if (templates.length < 2) {
            throw new Error("❌ 预期的测试模板数量不足！");
        }

        for (const tpl of templates) {
            console.log(`\n📋 模板详情 - ID: ${tpl.id}, Name: ${tpl.name}`);
            console.log(`   - 支持照片数量: ${tpl.photoCount}`);
            console.log(`   - 分类: ${tpl.category}`);
            console.log(`   - 布局元素个数: ${tpl.layoutSchema.elements.length}`);
            
            // 验证关键定位样式是否存在
            for (const elem of tpl.layoutSchema.elements) {
                if (!elem.id || !elem.type || !elem.style || !elem.style.left || !elem.style.top || !elem.style.width || !elem.style.height) {
                    throw new Error(`❌ 模板元素格式错误: ${JSON.stringify(elem)}`);
                }
            }
        }
        console.log('\n🎉 所有动态模板 API 服务与 Schema 校验通过，100% 运行正常！');
    } catch (e) {
        console.error('❌ 校验失败:', e);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

testApiAndDb();
