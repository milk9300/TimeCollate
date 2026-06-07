-- TimeCollate 反馈意见回复字段迁移脚本
USE timecollate;

-- 修改 feedbacks 表，新增管理员回复字段
ALTER TABLE feedbacks
ADD COLUMN reply_content TEXT DEFAULT NULL COMMENT '管理员回复内容',
ADD COLUMN reply_at BIGINT DEFAULT NULL COMMENT '回复时间戳';
