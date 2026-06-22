-- TimeCollate 动态模版表初始化与迁移脚本
USE timecollate;

-- 1. 修改 pages 表中的 layout 属性，使其支持动态模板的 UUID (若列已被删除则忽略)
SET @layout_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND column_name = 'layout'
);

SET @alter_layout_stmt = IF(
    @layout_exists > 0,
    'ALTER TABLE pages MODIFY COLUMN layout VARCHAR(36) DEFAULT \'grid\' COMMENT \'布局类型/模板ID\'',
    'SELECT 1'
);

PREPARE stmt_layout FROM @alter_layout_stmt;
EXECUTE stmt_layout;
DEALLOCATE PREPARE stmt_layout;

-- 2. 创建动态模板表
CREATE TABLE IF NOT EXISTS book_templates (
    id VARCHAR(36) PRIMARY KEY COMMENT '模板唯一标识',
    name VARCHAR(50) NOT NULL COMMENT '模板名称',
    photo_count INT NOT NULL COMMENT '支持照片数量',
    category VARCHAR(20) DEFAULT 'general' COMMENT '分类类型',
    layout_schema JSON NOT NULL COMMENT '模板排版布局JSON定义',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB COMMENT='数据驱动排版模板表';

-- 3. 清理已有的旧数据（防止主键冲突），并灌入测试种子模板
DELETE FROM book_templates WHERE id IN ('minimalist-2-photos', 'asymmetric-3-photos');

INSERT INTO book_templates (id, name, photo_count, category, layout_schema) VALUES
(
  'minimalist-2-photos',
  '简约时尚双图 (动态)',
  2,
  'modern',
  '{
    "background": { "color": "var(--theme-bg)", "gridPattern": false },
    "elements": [
      {
        "id": "tpl-title",
        "type": "text",
        "role": "chapter-title",
        "style": { "left": "10%", "top": "8%", "width": "80%", "height": "8%", "fontSize": "22pt", "fontWeight": "bold" }
      },
      {
        "id": "photo-0",
        "type": "photo",
        "slotIndex": 0,
        "style": { "left": "10%", "top": "18%", "width": "38%", "height": "50%" }
      },
      {
        "id": "photo-1",
        "type": "photo",
        "slotIndex": 1,
        "style": { "left": "52%", "top": "18%", "width": "38%", "height": "50%" }
      },
      {
        "id": "tpl-content",
        "type": "text",
        "role": "page-content",
        "style": { "left": "10%", "top": "72%", "width": "80%", "height": "15%", "fontSize": "10pt", "lineHeight": "1.6" }
      }
    ]
  }'
),
(
  'asymmetric-3-photos',
  '画册艺术三图 (动态)',
  3,
  'magazine',
  '{
    "background": { "color": "var(--theme-bg)", "gridPattern": false },
    "elements": [
      {
        "id": "tpl-title",
        "type": "text",
        "role": "chapter-title",
        "style": { "left": "8%", "top": "6%", "width": "84%", "height": "8%", "fontSize": "24pt", "fontWeight": "black" }
      },
      {
        "id": "photo-0",
        "type": "photo",
        "slotIndex": 0,
        "style": { "left": "8%", "top": "16%", "width": "50%", "height": "56%" }
      },
      {
        "id": "photo-1",
        "type": "photo",
        "slotIndex": 1,
        "style": { "left": "61%", "top": "16%", "width": "31%", "height": "26%" }
      },
      {
        "id": "photo-2",
        "type": "photo",
        "slotIndex": 2,
        "style": { "left": "61%", "top": "46%", "width": "31%", "height": "26%" }
      },
      {
        "id": "tpl-content",
        "type": "text",
        "role": "page-content",
        "style": { "left": "8%", "top": "76%", "width": "84%", "height": "12%", "fontSize": "10pt", "lineHeight": "1.6" }
      }
    ]
  }'
);
