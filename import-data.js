#!/usr/bin/env node

/**
 * 数据导入脚本
 * 用于将 JSON 导出文件导入到 PostgreSQL 数据库
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'babybeats',
  user: process.env.DB_USER || 'babybeats',
  password: process.env.DB_PASSWORD,
});

// 辅助函数：转换时间戳为数据库格式
function toTimestamp(ms) {
  return new Date(ms).toISOString();
}

// 导入宝宝信息
async function importBaby(client, baby, userId) {
  console.log(`  📝 导入宝宝: ${baby.name}`);
  
  await client.query(
    `INSERT INTO babies (id, user_id, name, gender, birthday, due_date, blood_type, 
                         birth_height, birth_weight, birth_head_circ, avatar, is_archived, 
                         created_at, updated_at, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       gender = EXCLUDED.gender,
       updated_at = EXCLUDED.updated_at`,
    [
      baby.id,
      userId,
      baby.name,
      baby.gender,
      baby.birthday ? toTimestamp(baby.birthday) : null,
      baby.dueDate ? toTimestamp(baby.dueDate) : null,
      baby.bloodType,
      baby.birthHeight,
      baby.birthWeight,
      baby.birthHeadCirc,
      baby.avatar,
      baby.isArchived || false,
      toTimestamp(baby.createdAt),
      toTimestamp(baby.updatedAt),
      baby.syncedAt ? toTimestamp(baby.syncedAt) : null,
    ]
  );
}

// 导入喂养记录
async function importFeedings(client, feedings, babyId) {
  console.log(`  🍼 导入 ${feedings.length} 条喂养记录`);
  
  for (const feeding of feedings) {
    await client.query(
      `INSERT INTO feedings (id, baby_id, time, type, left_duration, right_duration, 
                            milk_amount, milk_brand, notes, created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         time = EXCLUDED.time,
         type = EXCLUDED.type,
         milk_amount = EXCLUDED.milk_amount,
         updated_at = EXCLUDED.updated_at`,
      [
        feeding.id,
        babyId,
        toTimestamp(feeding.time),
        feeding.type,
        feeding.leftDuration || 0,
        feeding.rightDuration || 0,
        feeding.milkAmount || 0,
        feeding.milkBrand,
        feeding.notes,
        toTimestamp(feeding.createdAt),
        toTimestamp(feeding.updatedAt),
        feeding.syncedAt ? toTimestamp(feeding.syncedAt) : null,
      ]
    );
  }
}

// 导入睡眠记录
async function importSleeps(client, sleeps, babyId) {
  console.log(`  😴 导入 ${sleeps.length} 条睡眠记录`);
  
  for (const sleep of sleeps) {
    await client.query(
      `INSERT INTO sleeps (id, baby_id, start_time, end_time, duration, sleep_type, 
                          fall_asleep_method, notes, created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         duration = EXCLUDED.duration,
         updated_at = EXCLUDED.updated_at`,
      [
        sleep.id,
        babyId,
        toTimestamp(sleep.startTime),
        sleep.endTime ? toTimestamp(sleep.endTime) : null,
        sleep.duration,
        sleep.sleepType,
        sleep.fallAsleepMethod,
        sleep.notes,
        toTimestamp(sleep.createdAt),
        toTimestamp(sleep.updatedAt),
        sleep.syncedAt ? toTimestamp(sleep.syncedAt) : null,
      ]
    );
  }
}

// 导入尿布记录
async function importDiapers(client, diapers, babyId) {
  console.log(`  🩲 导入 ${diapers.length} 条尿布记录`);
  
  for (const diaper of diapers) {
    await client.query(
      `INSERT INTO diapers (id, baby_id, time, type, poop_consistency, poop_color, 
                           poop_amount, pee_amount, has_abnormality, wet_weight, 
                           dry_weight, urine_amount, notes, created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         time = EXCLUDED.time,
         type = EXCLUDED.type,
         updated_at = EXCLUDED.updated_at`,
      [
        diaper.id,
        babyId,
        toTimestamp(diaper.time),
        diaper.type,
        diaper.poopConsistency,
        diaper.poopColor,
        diaper.poopAmount,
        diaper.peeAmount,
        diaper.hasAbnormality || false,
        diaper.wetWeight,
        diaper.dryWeight,
        diaper.urineAmount,
        diaper.notes,
        toTimestamp(diaper.createdAt),
        toTimestamp(diaper.updatedAt),
        diaper.syncedAt ? toTimestamp(diaper.syncedAt) : null,
      ]
    );
  }
}

// 导入生长记录
async function importGrowthRecords(client, records, babyId) {
  console.log(`  📏 导入 ${records.length} 条生长记录`);
  
  for (const record of records) {
    await client.query(
      `INSERT INTO growth_records (id, baby_id, date, height, weight, head_circ, 
                                   temperature, bmi, notes, created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         height = EXCLUDED.height,
         weight = EXCLUDED.weight,
         updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        babyId,
        toTimestamp(record.date),
        record.height,
        record.weight,
        record.headCirc,
        record.temperature,
        record.bmi,
        record.notes,
        toTimestamp(record.createdAt),
        toTimestamp(record.updatedAt),
        record.syncedAt ? toTimestamp(record.syncedAt) : null,
      ]
    );
  }
}

// 导入疫苗记录
async function importVaccines(client, vaccines, babyId) {
  console.log(`  💉 导入 ${vaccines.length} 条疫苗记录`);
  
  for (const vaccine of vaccines) {
    await client.query(
      `INSERT INTO vaccines (id, baby_id, vaccine_name, vaccination_date, dose_number, 
                            location, batch_number, next_date, reminder_enabled, notes, 
                            created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         vaccine_name = EXCLUDED.vaccine_name,
         vaccination_date = EXCLUDED.vaccination_date,
         updated_at = EXCLUDED.updated_at`,
      [
        vaccine.id,
        babyId,
        vaccine.vaccineName,
        toTimestamp(vaccine.vaccinationDate),
        vaccine.doseNumber,
        vaccine.location,
        vaccine.batchNumber,
        vaccine.nextDate ? toTimestamp(vaccine.nextDate) : null,
        vaccine.reminderEnabled !== false,
        vaccine.notes,
        toTimestamp(vaccine.createdAt),
        toTimestamp(vaccine.updatedAt),
        vaccine.syncedAt ? toTimestamp(vaccine.syncedAt) : null,
      ]
    );
  }
}

// 导入就医记录
async function importMedicalVisits(client, visits, babyId) {
  console.log(`  🏥 导入 ${visits.length} 条就医记录`);
  
  for (const visit of visits) {
    await client.query(
      `INSERT INTO medical_visits (id, baby_id, visit_time, hospital, department, 
                                   doctor_name, symptoms, diagnosis, doctor_advice, 
                                   notes, created_at, updated_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         visit_time = EXCLUDED.visit_time,
         hospital = EXCLUDED.hospital,
         updated_at = EXCLUDED.updated_at`,
      [
        visit.id,
        babyId,
        toTimestamp(visit.visitTime),
        visit.hospital,
        visit.department,
        visit.doctorName,
        visit.symptoms,
        visit.diagnosis,
        visit.doctorAdvice,
        visit.notes,
        toTimestamp(visit.createdAt),
        toTimestamp(visit.updatedAt),
        visit.syncedAt ? toTimestamp(visit.syncedAt) : null,
      ]
    );
  }
}

// 主导入函数
async function importData(jsonFilePath, userEmail) {
  const client = await pool.connect();
  
  try {
    console.log('📦 开始导入数据...\n');
    
    // 读取 JSON 文件
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    
    // 查找用户 ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error(`用户 ${userEmail} 不存在，请先注册账号`);
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ 找到用户: ${userEmail} (ID: ${userId})\n`);
    
    // 开始事务
    await client.query('BEGIN');
    
    // 1. 导入宝宝信息
    if (jsonData.baby) {
      await importBaby(client, jsonData.baby, userId);
      const babyId = jsonData.baby.id;
      
      // 2. 导入喂养记录
      if (jsonData.feedings && jsonData.feedings.length > 0) {
        await importFeedings(client, jsonData.feedings, babyId);
      }
      
      // 3. 导入睡眠记录
      if (jsonData.sleeps && jsonData.sleeps.length > 0) {
        await importSleeps(client, jsonData.sleeps, babyId);
      }
      
      // 4. 导入尿布记录
      if (jsonData.diapers && jsonData.diapers.length > 0) {
        await importDiapers(client, jsonData.diapers, babyId);
      }
      
      // 5. 导入生长记录
      if (jsonData.growthRecords && jsonData.growthRecords.length > 0) {
        await importGrowthRecords(client, jsonData.growthRecords, babyId);
      }
      
      // 6. 导入疫苗记录
      if (jsonData.vaccines && jsonData.vaccines.length > 0) {
        await importVaccines(client, jsonData.vaccines, babyId);
      }
      
      // 7. 导入就医记录
      if (jsonData.medicalVisits && jsonData.medicalVisits.length > 0) {
        await importMedicalVisits(client, jsonData.medicalVisits, babyId);
      }
    }
    
    // 提交事务
    await client.query('COMMIT');
    
    console.log('\n🎉 数据导入成功！');
    console.log('\n📊 导入统计：');
    console.log(`  - 宝宝: 1`);
    console.log(`  - 喂养记录: ${jsonData.feedings?.length || 0}`);
    console.log(`  - 睡眠记录: ${jsonData.sleeps?.length || 0}`);
    console.log(`  - 尿布记录: ${jsonData.diapers?.length || 0}`);
    console.log(`  - 生长记录: ${jsonData.growthRecords?.length || 0}`);
    console.log(`  - 疫苗记录: ${jsonData.vaccines?.length || 0}`);
    console.log(`  - 就医记录: ${jsonData.medicalVisits?.length || 0}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 导入失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 命令行参数处理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法:');
    console.log('  node import-data.js <JSON文件路径> <用户邮箱>');
    console.log('\n示例:');
    console.log('  node import-data.js ./BabyBeats_朱锦汐_1767427094259.json zhujinxi@qq.com');
    process.exit(1);
  }
  
  const [jsonFile, userEmail] = args;
  
  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ 文件不存在: ${jsonFile}`);
    process.exit(1);
  }
  
  importData(jsonFile, userEmail)
    .then(() => {
      console.log('\n✅ 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 错误:', error);
      process.exit(1);
    });
}

module.exports = { importData };

