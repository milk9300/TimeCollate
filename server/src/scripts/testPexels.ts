import { pexelsService } from '../services/PexelsService.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    console.log('🧪 开始 Pexels API 集成测试...');
    
    try {
        // 1. 测试精选照片 (Curated)
        console.log('\n1. 测试获取 Pexels 每日精选图片 (Curated)...');
        const curated = await pexelsService.getCuratedPhotos(1, 2);
        console.log(`✅ 成功获取精选图片！总数: ${curated.total}, 返回页数: ${curated.page}`);
        console.log('第一张精选图片数据样张:');
        console.dir(curated.items[0], { depth: null, colors: true });

        // 2. 测试关键词搜索 (Search)
        const query = 'nature';
        console.log(`\n2. 测试搜索 Pexels 图片 (关键词: "${query}")...`);
        const searchResults = await pexelsService.searchPhotos(query, 1, 2);
        console.log(`✅ 成功检索搜索图片！总数: ${searchResults.total}, 返回页数: ${searchResults.page}`);
        console.log('第一张搜索图片数据样张:');
        console.dir(searchResults.items[0], { depth: null, colors: true });

        // 3. 测试通过 ID 获取单张照片 (Get Photo by ID)
        if (searchResults.items.length > 0) {
            const firstPhotoIdStr = searchResults.items[0].id.replace('pexels-', '');
            const firstPhotoId = parseInt(firstPhotoIdStr, 10);
            console.log(`\n3. 测试获取单张图片详情 (ID: ${firstPhotoId})...`);
            const photoDetail = await pexelsService.getPhotoById(firstPhotoId);
            console.log('✅ 成功获取单张详情！');
            console.dir(photoDetail, { depth: null, colors: true });
        }

        console.log('\n🎉 所有 Pexels 服务端测试项目全部通过！');
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    } finally {
        // 优雅退出
        process.exit(0);
    }
}

runTest();
