-- 数据库迁移脚本：将 UUID 类型改为 VARCHAR(100)
-- 警告：此操作会删除所有现有数据！如果有重要数据，请先备份！
-- 执行方式：psql -U your_username -d babybeats < migrate_uuid_to_varchar.sql

-- 开始事务
BEGIN;

-- 删除所有表的触发器（避免删除表时出错）
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_babies_updated_at ON babies;
DROP TRIGGER IF EXISTS update_feedings_updated_at ON feedings;
DROP TRIGGER IF EXISTS update_diapers_updated_at ON diapers;
DROP TRIGGER IF EXISTS update_sleeps_updated_at ON sleeps;
DROP TRIGGER IF EXISTS update_pumpings_updated_at ON pumpings;
DROP TRIGGER IF EXISTS update_growth_records_updated_at ON growth_records;
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
DROP TRIGGER IF EXISTS update_medical_visits_updated_at ON medical_visits;
DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
DROP TRIGGER IF EXISTS update_vaccines_updated_at ON vaccines;

-- 删除所有表（按照依赖顺序）
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS vaccines CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS medical_visits CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS growth_records CASCADE;
DROP TABLE IF EXISTS pumpings CASCADE;
DROP TABLE IF EXISTS sleeps CASCADE;
DROP TABLE IF EXISTS diapers CASCADE;
DROP TABLE IF EXISTS feedings CASCADE;
DROP TABLE IF EXISTS babies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 删除 UUID 扩展（可选，如果不再需要）
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- 提交事务
COMMIT;

-- 输出提示信息
\echo '======================================================'
\echo '所有表已删除！现在请执行 schema.sql 重新创建表。'
\echo '命令：psql -U your_username -d babybeats < schema.sql'
\echo '======================================================'

