-- BabyBeats Database Schema

-- 注意：使用 VARCHAR 而不是 UUID 以支持客户端生成的 ID 格式
-- 客户端 ID 格式: timestamp-randomstring (例如: 1763274396912-2zlpaocgl)

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 宝宝表
CREATE TABLE IF NOT EXISTS babies (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) CHECK(gender IN ('male', 'female', 'unknown')),
  birthday TIMESTAMP NOT NULL,
  due_date TIMESTAMP,
  blood_type VARCHAR(10),
  birth_height DECIMAL(5,2),
  birth_weight DECIMAL(6,2),
  birth_head_circ DECIMAL(5,2),
  avatar TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_babies_user_id ON babies(user_id);
CREATE INDEX idx_babies_is_archived ON babies(is_archived);
CREATE INDEX idx_babies_created_at ON babies(created_at);

-- 喂养记录表
CREATE TABLE IF NOT EXISTS feedings (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  time TIMESTAMP NOT NULL,
  type VARCHAR(50) NOT NULL CHECK(type IN ('breast', 'bottled_breast_milk', 'formula')),
  left_duration INTEGER DEFAULT 0,
  right_duration INTEGER DEFAULT 0,
  milk_amount DECIMAL(6,2) DEFAULT 0,
  milk_brand VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_feedings_baby_id ON feedings(baby_id);
CREATE INDEX idx_feedings_time ON feedings(time);
CREATE INDEX idx_feedings_baby_time ON feedings(baby_id, time);

-- 尿布记录表
CREATE TABLE IF NOT EXISTS diapers (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  time TIMESTAMP NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('poop', 'pee', 'both')),
  poop_consistency VARCHAR(20) CHECK(poop_consistency IN ('loose', 'normal', 'hard', 'other')),
  poop_color VARCHAR(20) CHECK(poop_color IN ('yellow', 'green', 'dark', 'other')),
  poop_amount VARCHAR(20) CHECK(poop_amount IN ('small', 'medium', 'large')),
  pee_amount VARCHAR(20) CHECK(pee_amount IN ('small', 'medium', 'large')),
  has_abnormality BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_diapers_baby_id ON diapers(baby_id);
CREATE INDEX idx_diapers_time ON diapers(time);
CREATE INDEX idx_diapers_baby_time ON diapers(baby_id, time);

-- 睡眠记录表
CREATE TABLE IF NOT EXISTS sleeps (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  sleep_type VARCHAR(20) NOT NULL CHECK(sleep_type IN ('nap', 'night')),
  fall_asleep_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_sleeps_baby_id ON sleeps(baby_id);
CREATE INDEX idx_sleeps_start_time ON sleeps(start_time);
CREATE INDEX idx_sleeps_baby_time ON sleeps(baby_id, start_time);

-- 挤奶记录表
CREATE TABLE IF NOT EXISTS pumpings (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  time TIMESTAMP NOT NULL,
  method VARCHAR(20) CHECK(method IN ('electric', 'manual', 'other')),
  left_amount DECIMAL(6,2) DEFAULT 0,
  right_amount DECIMAL(6,2) DEFAULT 0,
  total_amount DECIMAL(6,2),
  storage_method VARCHAR(20) CHECK(storage_method IN ('refrigerate', 'freeze', 'feed_now', 'other')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_pumpings_baby_id ON pumpings(baby_id);
CREATE INDEX idx_pumpings_time ON pumpings(time);

-- 成长记录表
CREATE TABLE IF NOT EXISTS growth_records (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  height DECIMAL(5,2),
  weight DECIMAL(6,2),
  head_circ DECIMAL(5,2),
  temperature DECIMAL(4,2),
  bmi DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_growth_baby_id ON growth_records(baby_id);
CREATE INDEX idx_growth_date ON growth_records(date);

-- 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  time TIMESTAMP NOT NULL,
  milestone_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_milestones_baby_id ON milestones(baby_id);
CREATE INDEX idx_milestones_time ON milestones(time);

-- 就诊记录表
CREATE TABLE IF NOT EXISTS medical_visits (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  visit_time TIMESTAMP NOT NULL,
  hospital VARCHAR(200),
  department VARCHAR(100),
  doctor_name VARCHAR(100),
  symptoms TEXT,
  diagnosis TEXT,
  doctor_advice TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_visits_baby_id ON medical_visits(baby_id);
CREATE INDEX idx_visits_time ON medical_visits(visit_time);

-- 用药记录表
CREATE TABLE IF NOT EXISTS medications (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  medication_time TIMESTAMP NOT NULL,
  medication_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  administration_method VARCHAR(100),
  visit_id VARCHAR(100) REFERENCES medical_visits(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_medications_baby_id ON medications(baby_id);
CREATE INDEX idx_medications_time ON medications(medication_time);

-- 疫苗记录表
CREATE TABLE IF NOT EXISTS vaccines (
  id VARCHAR(100) PRIMARY KEY,
  baby_id VARCHAR(100) NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(200) NOT NULL,
  vaccination_date TIMESTAMP NOT NULL,
  dose_number INTEGER,
  location VARCHAR(200),
  batch_number VARCHAR(100),
  next_date TIMESTAMP,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_vaccines_baby_id ON vaccines(baby_id);
CREATE INDEX idx_vaccines_date ON vaccines(vaccination_date);
CREATE INDEX idx_vaccines_next_date ON vaccines(next_date);

-- 同步日志表（用于追踪数据同步状态）
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(100),
  last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_status VARCHAR(20) CHECK(sync_status IN ('success', 'failed', 'partial')),
  error_message TEXT
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_time ON sync_logs(last_sync_time);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_babies_updated_at BEFORE UPDATE ON babies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedings_updated_at BEFORE UPDATE ON feedings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diapers_updated_at BEFORE UPDATE ON diapers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleeps_updated_at BEFORE UPDATE ON sleeps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pumpings_updated_at BEFORE UPDATE ON pumpings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_records_updated_at BEFORE UPDATE ON growth_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_visits_updated_at BEFORE UPDATE ON medical_visits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaccines_updated_at BEFORE UPDATE ON vaccines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

