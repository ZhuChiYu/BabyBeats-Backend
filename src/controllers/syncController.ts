import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const TABLE_NAMES = [
  'babies',
  'feedings',
  'diapers',
  'sleeps',
  'pumpings',
  'growth_records',
  'milestones',
  'medical_visits',
  'medications',
  'vaccines',
];

interface SyncData {
  tableName: string;
  records: any[];
}

export const syncPull = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { lastSyncTime } = req.query;

    console.log('============ Sync Pull Request ============');
    console.log('User ID:', userId);
    console.log('Last sync time:', lastSyncTime || '全量同步（获取所有数据）');
    console.log('Device ID:', req.headers['device-id'] || 'unknown');

    // 如果没有传 lastSyncTime，使用一个很早的时间（Unix 纪元）以获取所有数据
    const syncTime = lastSyncTime ? new Date(lastSyncTime as string) : new Date(0);
    console.log('查询时间戳:', syncTime.toISOString());

    // 获取用户的所有宝宝
    // 注意：使用 >= 而不是 > 以确保包含边界数据
    const babiesResult = await pool.query(
      `SELECT * FROM babies
       WHERE user_id = $1 AND updated_at >= $2
       ORDER BY updated_at ASC`,
      [userId, syncTime]
    );

    const babies = babiesResult.rows;
    const babyIds = babies.map(b => b.id);

    console.log('找到的宝宝数量:', babies.length);
    console.log('宝宝IDs:', babyIds);

    // 获取所有记录表的更新数据
    const data: any = {
      babies,
    };

    if (babyIds.length > 0) {
      const placeholders = babyIds.map((_, i) => `$${i + 2}`).join(',');

      for (const tableName of TABLE_NAMES.filter(t => t !== 'babies')) {
        const result = await pool.query(
          `SELECT * FROM ${tableName}
           WHERE baby_id IN (${placeholders}) AND updated_at >= $1
           ORDER BY updated_at ASC`,
          [syncTime, ...babyIds]
        );
        data[tableName] = result.rows;
        console.log(`${tableName}: ${result.rows.length} 条记录`);
      }
    } else {
      // 如果没有宝宝，所有记录表都返回空数组
      TABLE_NAMES.filter(t => t !== 'babies').forEach(tableName => {
        data[tableName] = [];
      });
      console.log('没有宝宝数据，返回空记录');
    }

    // 记录同步日志
    await pool.query(
      `INSERT INTO sync_logs (user_id, device_id, sync_status)
       VALUES ($1, $2, $3)`,
      [userId, req.headers['device-id'] || 'unknown', 'success']
    );

    console.log('✓ Pull 请求成功完成');
    console.log('============================================');

    res.json({
      status: 'success',
      data: {
        syncTime: new Date().toISOString(),
        data,
      },
    });
  } catch (error) {
    console.error('❌ Pull 请求失败:', error);
    
    // 记录失败日志
    const userId = (req as any).userId;
    await pool.query(
      `INSERT INTO sync_logs (user_id, device_id, sync_status, error_message)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        req.headers['device-id'] || 'unknown',
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
      ]
    );

    next(error);
  }
};

export const syncPush = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();

  try {
    const userId = (req as any).userId;
    const { data } = req.body as { data: SyncData[] };

    console.log('============ Sync Push Request ============');
    console.log('User ID:', userId);
    console.log('Device ID:', req.headers['device-id'] || 'unknown');
    console.log('推送的数据表数量:', data?.length || 0);

    if (!data || !Array.isArray(data)) {
      throw new AppError('Invalid data format: expected array', 400);
    }

    await client.query('BEGIN');

    const results: any = {
      success: [],
      conflicts: [],
      errors: [],
    };

    // 处理每个表的数据
    for (const tableData of data) {
      const { tableName, records } = tableData;

      console.log(`处理表 ${tableName}, 记录数: ${records?.length || 0}`);

      if (!TABLE_NAMES.includes(tableName)) {
        console.warn(`无效的表名: ${tableName}`);
        results.errors.push({
          tableName,
          message: 'Invalid table name',
        });
        continue;
      }

      if (!records || !Array.isArray(records)) {
        console.warn(`表 ${tableName} 的记录格式无效`);
        results.errors.push({
          tableName,
          message: 'Invalid records format',
        });
        continue;
      }

      for (const record of records) {
        try {
          // 验证必要字段
          if (!record.id) {
            throw new Error('Record missing required field: id');
          }

          // 对于 babies 表，验证 user_id 匹配
          if (tableName === 'babies' && record.user_id !== userId) {
            console.warn(`宝宝 ${record.id} 的 user_id 不匹配: ${record.user_id} vs ${userId}`);
            throw new Error('User ID mismatch');
          }

          // 检查记录是否存在
          const existingResult = await client.query(
            `SELECT id, updated_at FROM ${tableName} WHERE id = $1`,
            [record.id]
          );

          if (existingResult.rows.length === 0) {
            // 插入新记录
            const columns = Object.keys(record).join(', ');
            const placeholders = Object.keys(record)
              .map((_, i) => `$${i + 1}`)
              .join(', ');
            const values = Object.values(record);

            console.log(`插入新记录到 ${tableName}:`, record.id);

            await client.query(
              `INSERT INTO ${tableName} (${columns})
               VALUES (${placeholders})`,
              values
            );

            results.success.push({
              tableName,
              id: record.id,
              action: 'insert',
            });
          } else {
            // 检查冲突
            const existing = existingResult.rows[0];
            const existingTime = new Date(existing.updated_at).getTime();
            const recordTime = new Date(record.updated_at).getTime();

            if (recordTime > existingTime) {
              // 客户端数据更新，更新服务器数据
              const setClauses = Object.keys(record)
                .filter(key => key !== 'id')
                .map((key, i) => `${key} = $${i + 2}`)
                .join(', ');
              const values = Object.keys(record)
                .filter(key => key !== 'id')
                .map(key => record[key]);

              console.log(`更新 ${tableName} 记录:`, record.id);

              await client.query(
                `UPDATE ${tableName}
                 SET ${setClauses}
                 WHERE id = $1`,
                [record.id, ...values]
              );

              results.success.push({
                tableName,
                id: record.id,
                action: 'update',
              });
            } else {
              // 服务器数据更新，记录冲突
              console.log(`检测到冲突 ${tableName}:`, record.id);
              results.conflicts.push({
                tableName,
                id: record.id,
                serverRecord: existing,
                clientRecord: record,
              });
            }
          }
        } catch (error) {
          console.error(`处理记录失败 ${tableName}:`, record.id, error);
          results.errors.push({
            tableName,
            id: record.id,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    await client.query('COMMIT');

    console.log('推送结果:');
    console.log('- 成功:', results.success.length);
    console.log('- 冲突:', results.conflicts.length);
    console.log('- 错误:', results.errors.length);

    // 记录同步日志
    await client.query(
      `INSERT INTO sync_logs (user_id, device_id, sync_status)
       VALUES ($1, $2, $3)`,
      [
        userId,
        req.headers['device-id'] || 'unknown',
        results.errors.length > 0 ? 'partial' : 'success',
      ]
    );

    console.log('✓ Push 请求成功完成');
    console.log('============================================');

    res.json({
      status: 'success',
      data: results,
    });
  } catch (error) {
    console.error('❌ Push 请求失败:', error);
    
    await client.query('ROLLBACK');

    // 记录失败日志
    const userId = (req as any).userId;
    await client.query(
      `INSERT INTO sync_logs (user_id, device_id, sync_status, error_message)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        req.headers['device-id'] || 'unknown',
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
      ]
    );

    next(error);
  } finally {
    client.release();
  }
};

export const getSyncStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const result = await pool.query(
      `SELECT id, device_id, last_sync_time, sync_status, error_message
       FROM sync_logs
       WHERE user_id = $1
       ORDER BY last_sync_time DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      status: 'success',
      data: {
        syncLogs: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

