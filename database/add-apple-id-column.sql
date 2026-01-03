-- 添加 apple_id 字段到 users 表
-- 用于支持 Sign in with Apple 功能

-- 添加 apple_id 列（如果不存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255);

-- 为 apple_id 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN users.apple_id IS 'Apple Sign In 唯一标识符';


