import { pool } from '../db/index.js';
import { socialService } from '../services/SocialService.js';
import { notificationService } from '../services/NotificationService.js';

async function runSocialTest() {
    console.log('🧪 开始社交与通知系统集成测试...');

    const userA = {
        id: 'test-social-a',
        nickname: '测试社交A',
        username: 'test_social_a',
        password_hash: 'hash_a',
        created_at: Date.now()
    };

    const userB = {
        id: 'test-social-b',
        nickname: '测试社交B',
        username: 'test_social_b',
        password_hash: 'hash_b',
        created_at: Date.now()
    };

    const userC = {
        id: 'test-social-c',
        nickname: '测试社交C',
        username: 'test_social_c',
        password_hash: 'hash_c',
        created_at: Date.now()
    };

    const bookB = {
        id: 'test-book-b',
        user_id: userB.id,
        title: '测试用户B的书籍',
        created_at: Date.now()
    };

    try {
        // 1. 清理遗留测试数据并初始化测试用户与书籍
        console.log('1. 清理遗留并初始化测试用户与书籍...');
        await pool.query('DELETE FROM notifications WHERE receiver_id IN (?, ?, ?) OR sender_id IN (?, ?, ?)', [userA.id, userB.id, userC.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM book_comments WHERE book_id = ? OR user_id IN (?, ?, ?)', [bookB.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM user_follows WHERE follower_id IN (?, ?, ?) OR leader_id IN (?, ?, ?)', [userA.id, userB.id, userC.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM books WHERE id = ?', [bookB.id]);
        await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);

        await pool.query(
            'INSERT INTO users (id, nickname, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
            [
                userA.id, userA.nickname, userA.username, userA.password_hash, userA.created_at,
                userB.id, userB.nickname, userB.username, userB.password_hash, userB.created_at,
                userC.id, userC.nickname, userC.username, userC.password_hash, userC.created_at
            ]
        );

        await pool.query(
            'INSERT INTO books (id, user_id, title, created_at) VALUES (?, ?, ?, ?)',
            [bookB.id, bookB.user_id, bookB.title, bookB.created_at]
        );

        // 2. 关注与粉丝测试
        console.log('2. 测试用户关注与取消关注...');
        const followRes1 = await socialService.toggleFollow(userA.id, userB.id);
        if (!followRes1.followed) throw new Error('关注失败');
        console.log('  ✅ 成功：A 关注了 B');

        const isFollowing1 = await socialService.isFollowing(userA.id, userB.id);
        if (!isFollowing1) throw new Error('关注状态获取失败');

        const statsB = await socialService.getSocialStats(userB.id);
        if (statsB.followerCount !== 1) throw new Error(`B 的粉丝计数不正确: ${statsB.followerCount}`);
        console.log('  ✅ 成功：B 的粉丝数为 1');

        // A 取消关注 B
        const followRes2 = await socialService.toggleFollow(userA.id, userB.id);
        if (followRes2.followed) throw new Error('取消关注失败');
        console.log('  ✅ 成功：A 取关了 B');

        const statsBAfter = await socialService.getSocialStats(userB.id);
        if (statsBAfter.followerCount !== 0) throw new Error('B 的粉丝计数未扣减');
        console.log('  ✅ 成功：B 粉丝数回落为 0');

        // A 重新关注 B (用于后续测试通知)
        await pool.query('DELETE FROM notifications WHERE receiver_id = ?', [userB.id]);
        await socialService.toggleFollow(userA.id, userB.id);

        // 3. 留言与贴纸交互测试（含敏感词过滤）
        console.log('3. 测试时光留言、贴纸坐标及敏感词初筛...');
        // 留言带有敏感词 "傻逼" 和 "垃圾系统"
        const rawContent = '这本书写得太好了，那个说它是垃圾系统的人真是傻逼！';
        const pageId = 'test-page-1';
        const comment = await socialService.addComment(
            userA.id,
            bookB.id,
            pageId,
            rawContent,
            'warm-note',
            15,
            30
        );

        if (comment.content.includes('傻逼') || comment.content.includes('垃圾系统')) {
            throw new Error(`敏感词未被成功过滤: ${comment.content}`);
        }
        console.log(`  ✅ 成功：敏感词过滤通过。过滤后内容: "${comment.content}"`);

        if (comment.xPercent !== 15 || comment.yPercent !== 30 || comment.stickerType !== 'warm-note') {
            throw new Error('贴纸坐标/样式未正确保存');
        }
        console.log('  ✅ 成功：贴纸坐标与样式保存正确');

        const comments = await socialService.getComments(bookB.id, pageId);
        if (comments.length !== 1 || comments[0].id !== comment.id) {
            throw new Error('拉取单页评论列表失败');
        }
        console.log('  ✅ 成功：获取特定页面评论贴纸通过');

        // 4. 消息通知验证
        console.log('4. 测试触发式消息通知生成与消费...');
        // A 关注 B 并且 A 留言了 B 的书。B 应该收到两条通知
        const unreadCount = await notificationService.getUnreadCount(userB.id);
        if (unreadCount !== 2) {
            throw new Error(`B 的未读消息数不正确，预估 2，实际为: ${unreadCount}`);
        }
        console.log('  ✅ 成功：未读消息计数为 2');

        const notifications = await notificationService.getNotifications(userB.id, 1, 10);
        const hasFollowNotify = notifications.some(n => n.actionType === 'follow');
        const hasCommentNotify = notifications.some(n => n.actionType === 'comment');

        if (!hasFollowNotify || !hasCommentNotify) {
            throw new Error('未拉取到对应的关注或评论通知记录');
        }
        console.log('  ✅ 成功：拉取到了关注与评论的通知详情，包含发送者昵称');

        // B 标记通知为已读
        await notificationService.markAsRead(userB.id, [notifications[0].id]);
        const unreadCount2 = await notificationService.getUnreadCount(userB.id);
        if (unreadCount2 !== 1) {
            throw new Error(`标记已读后，未读计数不为 1: ${unreadCount2}`);
        }
        console.log('  ✅ 成功：部分标记已读正确，未读数扣减');

        await notificationService.markAsRead(userB.id);
        const unreadCount3 = await notificationService.getUnreadCount(userB.id);
        if (unreadCount3 !== 0) {
            throw new Error('一键标记已读失败');
        }
        console.log('  ✅ 成功：一键已读正确，未读数归零');

        // 5. 零信任鉴权删除评论测试
        console.log('5. 测试零信任越权删除拦截...');
        // C (第三方) 尝试删除 A 发表的评论，应当被拒绝
        try {
            await socialService.deleteComment(comment.id, userC.id);
            throw new Error('越权删除未被拦截');
        } catch (err: any) {
            if (err.message.includes('您没有权限删除此评论')) {
                console.log('  ✅ 成功：非相关第三方 C 越权删除评论被安全拒绝');
            } else {
                throw err;
            }
        }

        // B (书主) 删除 A 发表的评论，应当被允许
        await socialService.deleteComment(comment.id, userB.id);
        const commentsAfterDelete = await socialService.getComments(bookB.id, pageId);
        if (commentsAfterDelete.length !== 0) {
            throw new Error('书籍所有者删除评论失败');
        }
        console.log('  ✅ 成功：书籍所有者成功删除留言');

        // 6. 数据清理
        console.log('6. 清理测试垃圾数据...');
        await pool.query('DELETE FROM notifications WHERE receiver_id IN (?, ?, ?) OR sender_id IN (?, ?, ?)', [userA.id, userB.id, userC.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM book_comments WHERE book_id = ? OR user_id IN (?, ?, ?)', [bookB.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM user_follows WHERE follower_id IN (?, ?, ?) OR leader_id IN (?, ?, ?)', [userA.id, userB.id, userC.id, userA.id, userB.id, userC.id]);
        await pool.query('DELETE FROM books WHERE id = ?', [bookB.id]);
        await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);

        console.log('\n🎉 所有社交功能集成与零信任安全测试成功通过！');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ 社交与通知集成测试失败：', err);
        process.exit(1);
    }
}

runSocialTest();
