-- 向 pages 表增加 elements 字段以支持自由画布排版
USE timecollate;

SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND column_name = 'elements'
);

SET @add_col_stmt = IF(
    @column_exists = 0,
    'ALTER TABLE pages ADD COLUMN elements JSON DEFAULT NULL COMMENT \'页面内扁平存储的自由组件列表\'',
    'SELECT 1'
);

PREPARE stmt_col FROM @add_col_stmt;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- 修改 users 表的 role 字段，支持 creator 角色以实现创作者权限隔离
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'creator', 'admin') DEFAULT 'user' COMMENT '用户角色';

