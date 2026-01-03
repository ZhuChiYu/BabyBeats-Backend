-- 修复数据库 Schema 问题
-- 2025-11-16

-- 1. 修复 sleeps 表 - 移除不存在的 quality 字段的约束
-- 注意：前端代码使用的字段映射需要调整

-- 2. 修复 sync_logs 表的外键约束
-- 临时禁用外键约束，允许设备 ID 作为 user_id
ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_user_id_fkey;

-- 重新添加外键约束，但设为可空或使用 ON DELETE SET NULL
-- 或者完全移除外键约束，因为 device_id 可能不在 users 表中
-- 这里我们选择移除外键约束，因为同步可能在用户登录前发生

-- 3. 添加注释说明
COMMENT ON TABLE sync_logs IS '同步日志表 - user_id 可以是真实用户ID或设备ID';

-- 4. 如果需要，可以添加 quality 字段到 sleeps 表（但代码中并未使用）
-- ALTER TABLE sleeps ADD COLUMN IF NOT EXISTS quality VARCHAR(20);

-- 5. 查看当前表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sleeps'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sync_logs'
ORDER BY ordinal_position;

-- 6. 检查约束
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'sync_logs'::regclass;

