-- TimeCollate Database Migration
-- Add cover_page column to books table

USE timecollate;

ALTER TABLE books ADD COLUMN cover_page JSON DEFAULT NULL COMMENT '封面画布页面JSON';
