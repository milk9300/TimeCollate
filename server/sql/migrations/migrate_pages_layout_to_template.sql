-- TimeCollate 页面表排版布局向模板合并迁移脚本 (幂等安全版)
USE timecollate;

-- 1. 检测并删除外键约束 fk_pages_template_id (如果存在)
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND constraint_name = 'fk_pages_template_id'
);

SET @drop_fk_stmt = IF(
    @fk_exists > 0,
    'ALTER TABLE pages DROP FOREIGN KEY fk_pages_template_id',
    'SELECT 1'
);

PREPARE stmt_drop_fk FROM @drop_fk_stmt;
EXECUTE stmt_drop_fk;
DEALLOCATE PREPARE stmt_drop_fk;

-- 2. 检测 layout_type 列是否存在
SET @layout_type_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND column_name = 'layout_type'
);

-- 3. 如果 layout_type 存在，将数据同步到 template_id，然后删除 layout_type
SET @sync_and_drop_stmt = IF(
    @layout_type_exists > 0,
    'UPDATE pages SET template_id = layout_type WHERE template_id IS NULL OR template_id = \'\'',
    'SELECT 1'
);

PREPARE stmt_sync FROM @sync_and_drop_stmt;
EXECUTE stmt_sync;
DEALLOCATE PREPARE stmt_sync;

SET @drop_col_stmt = IF(
    @layout_type_exists > 0,
    'ALTER TABLE pages DROP COLUMN layout_type',
    'SELECT 1'
);

PREPARE stmt_drop_col FROM @drop_col_stmt;
EXECUTE stmt_drop_col;
DEALLOCATE PREPARE stmt_drop_col;
