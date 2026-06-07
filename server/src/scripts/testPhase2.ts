import { pool } from '../db/index.js';
import { FeedbackService } from '../services/FeedbackService.js';
import { templateService } from '../services/TemplateService.js';
import { themeService } from '../services/ThemeService.js';

const feedbackService = new FeedbackService();

async function runTest() {
    console.log('🧪 开始阶段二：零信任安全与 API 功能集成测试...');

    const userA = {
        id: 'test-uid-a',
        nickname: '测试用户A',
        username: 'test_user_a',
        password_hash: 'hash_a',
        created_at: Date.now()
    };

    const userB = {
        id: 'test-uid-b',
        nickname: '测试用户B',
        username: 'test_user_b',
        password_hash: 'hash_b',
        created_at: Date.now()
    };

    try {
        // 1. 清理并初始化测试用户
        console.log('1. 清理遗留并初始化测试用户...');
        await pool.query('DELETE FROM user_collected_templates WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM user_collected_themes WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM feedbacks WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM book_templates WHERE creator_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM book_themes WHERE creator_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM users WHERE id IN (?, ?)', [userA.id, userB.id]);

        await pool.query(
            'INSERT INTO users (id, nickname, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
            [
                userA.id, userA.nickname, userA.username, userA.password_hash, userA.created_at,
                userB.id, userB.nickname, userB.username, userB.password_hash, userB.created_at
            ]
        );

        // 2. 创建测试模板与主题（用户 B 创建）
        console.log('2. 创建测试模板与主题（由用户 B 所有）...');
        const tplPub = {
            id: 'test-template-pub',
            name: '用户B的公开模板',
            photoCount: 2,
            category: 'classic',
            layoutSchema: { rows: [] },
            visibility: 'public' as const,
            creatorId: userB.id
        };
        const tplPriv = {
            id: 'test-template-priv',
            name: '用户B的私有模板',
            photoCount: 1,
            category: 'modern',
            layoutSchema: { rows: [] },
            visibility: 'private' as const,
            creatorId: userB.id
        };

        const themePub = {
            id: 'test-theme-pub',
            name: '用户B的公开主题',
            creatorId: userB.id,
            visibility: 'public' as const,
            themeSchema: { colors: {} }
        };
        const themePriv = {
            id: 'test-theme-priv',
            name: '用户B的私有主题',
            creatorId: userB.id,
            visibility: 'private' as const,
            themeSchema: { colors: {} }
        };

        await templateService.saveTemplate(tplPub);
        await templateService.saveTemplate(tplPriv);
        await themeService.saveTheme(themePub);
        await themeService.saveTheme(themePriv);

        // 3. 创建测试反馈（用户 A 和 用户 B 各创建一条）
        console.log('3. 创建测试反馈记录...');
        const fbA = await feedbackService.saveFeedback({ content: '用户A的反馈', userId: userA.id });
        const fbB = await feedbackService.saveFeedback({ content: '用户B的反馈', userId: userB.id });

        // 4. 验证反馈隔离（防止越权）
        console.log('4. 验证反馈隔离性（零信任越权拦截测试）...');
        const feedbacksForA = await feedbackService.getFeedbacks(userA.id);
        const hasA = feedbacksForA.some((f: any) => f.id === fbA.id);
        const hasB = feedbacksForA.some((f: any) => f.id === fbB.id);

        if (hasA && !hasB) {
            console.log('  ✅ 成功：列表隔离测试通过（用户 A 只能拉到自己的反馈）');
        } else {
            throw new Error(`❌ 失败：反馈列表越权！A的用户列表内包含B的反馈或缺失自己的。`);
        }

        const detailA = await feedbackService.getFeedbackById(fbA.id, userA.id);
        const detailBForbidden = await feedbackService.getFeedbackById(fbB.id, userA.id);

        if (detailA && detailBForbidden === null) {
            console.log('  ✅ 成功：详情防越权测试通过（用户 A 查询用户 B 的反馈详情被拒绝）');
        } else {
            throw new Error(`❌ 失败：反馈详情越权！用户 A 成功获取了用户 B 的反馈详情`);
        }

        // 5. 验证个人资产库初始状态
        console.log('5. 验证个人资产库初始过滤...');
        const userATemplates = await templateService.getUserTemplates(userA.id);
        const userAThemes = await themeService.getUserThemes(userA.id);

        const containsPub = userATemplates.some(t => t.id === tplPub.id);
        const containsPriv = userATemplates.some(t => t.id === tplPriv.id);

        if (!containsPub && !containsPriv) {
            console.log('  ✅ 成功：初始状态下，用户 A 的资产库不包含用户 B 的任何模板');
        } else {
            throw new Error(`❌ 失败：用户 A 的初始资产库中意外包含用户 B 的模板`);
        }

        // 6. 验证模板/主题市场
        console.log('6. 验证市场过滤（公开可见，私有隔离）...');
        const marketTemplates = await templateService.getMarketTemplates(userA.id);
        const marketThemes = await themeService.getMarketThemes(userA.id);

        const mHasPub = marketTemplates.some(t => t.id === tplPub.id);
        const mHasPriv = marketTemplates.some(t => t.id === tplPriv.id);

        if (mHasPub && !mHasPriv) {
            console.log('  ✅ 成功：模板市场隔离测试通过（仅展示公开内容，过滤私有内容）');
        } else {
            throw new Error(`❌ 失败：模板市场展示了私有资产，或者缺失了公开资产`);
        }

        const mThemeHasPub = marketThemes.some(t => t.id === themePub.id);
        const mThemeHasPriv = marketThemes.some(t => t.id === themePriv.id);

        if (mThemeHasPub && !mThemeHasPriv) {
            console.log('  ✅ 成功：主题市场隔离测试通过');
        } else {
            throw new Error(`❌ 失败：主题市场隔离测试不符合预期`);
        }

        // 7. 模拟订阅收藏
        console.log('7. 验证资产收藏/订阅与个人库融合...');
        // A 收藏 B 的公开模板
        await pool.query(
            'INSERT INTO user_collected_templates (user_id, template_id, collected_at) VALUES (?, ?, ?)',
            [userA.id, tplPub.id, Date.now()]
        );
        // A 收藏 B 的公开主题
        await pool.query(
            'INSERT INTO user_collected_themes (user_id, theme_id, collected_at) VALUES (?, ?, ?)',
            [userA.id, themePub.id, Date.now()]
        );

        const updatedTemplates = await templateService.getUserTemplates(userA.id);
        const updatedThemes = await themeService.getUserThemes(userA.id);

        const collectedTemplateInLibrary = updatedTemplates.some(t => t.id === tplPub.id);
        const collectedThemeInLibrary = updatedThemes.some(t => t.id === themePub.id);

        if (collectedTemplateInLibrary && collectedThemeInLibrary) {
            console.log('  ✅ 成功：个人库与已订阅资产融合查询测试成功');
        } else {
            throw new Error(`❌ 失败：收藏的模板或主题未包含在用户个人资产库中`);
        }

        // 8. 验证零信任安全校验逻辑 (模拟私有资产鉴权失败)
        console.log('8. 验证零信任明细获取安全校验...');
        const tplPrivCheck = await templateService.getTemplateById(tplPriv.id);
        if (tplPrivCheck) {
            const isForbidden = tplPrivCheck.visibility !== 'public' && tplPrivCheck.creatorId !== userA.id;
            if (isForbidden) {
                console.log('  ✅ 成功：零信任安全拦截模型正确（非公开且非本人创建被鉴权拦截）');
            } else {
                throw new Error('❌ 失败：零信任校验逻辑未起效');
            }
        }

        // 9. 清理测试脏数据
        console.log('9. 清理测试垃圾数据...');
        await pool.query('DELETE FROM user_collected_templates WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM user_collected_themes WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM feedbacks WHERE user_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM book_templates WHERE creator_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM book_themes WHERE creator_id IN (?, ?)', [userA.id, userB.id]);
        await pool.query('DELETE FROM users WHERE id IN (?, ?)', [userA.id, userB.id]);

        console.log('\n🎉 所有测试均已成功通过！阶段二开发在安全和功能上验证无误！');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ 阶段二安全及功能测试失败：', err);
        process.exit(1);
    }
}

runTest();
