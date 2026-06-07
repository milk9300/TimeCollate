-- 增加是否展示序言页字段
ALTER TABLE books ADD COLUMN show_preface TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否展示书籍序言页：0-隐藏，1-展示';
