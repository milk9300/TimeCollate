-- TimeCollate 视频导出字段迁移脚本
USE timecollate;

-- 修改 export_tasks 表的 format 字段，使其支持 'video' 格式
ALTER TABLE export_tasks MODIFY COLUMN format ENUM('pdf', 'markdown', 'video') NOT NULL COMMENT '导出格式';
