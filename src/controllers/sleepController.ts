import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getSleeps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT s.* FROM sleeps s
      INNER JOIN babies b ON s.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND s.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND s.start_time >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND s.start_time <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY s.start_time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        sleeps: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id, babyId, startTime, endTime, duration, sleepType, fallAsleepMethod, notes } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO sleeps (id, baby_id, start_time, end_time, duration, sleep_type, fall_asleep_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, babyId, startTime, endTime, duration, sleepType, fallAsleepMethod, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        sleep: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { sleepId } = req.params;
    const { startTime, endTime, duration, sleepType, fallAsleepMethod, notes } = req.body;

    // 验证 sleep 属于当前用户
    const check = await pool.query(
      `SELECT s.id FROM sleeps s
       INNER JOIN babies b ON s.baby_id = b.id
       WHERE s.id = $1 AND b.user_id = $2`,
      [sleepId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Sleep record not found', 404);
    }

    const result = await pool.query(
      `UPDATE sleeps
       SET start_time = COALESCE($1, start_time),
           end_time = COALESCE($2, end_time),
           duration = COALESCE($3, duration),
           sleep_type = COALESCE($4, sleep_type),
           fall_asleep_method = COALESCE($5, fall_asleep_method),
           notes = COALESCE($6, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [startTime, endTime, duration, sleepType, fallAsleepMethod, notes, sleepId]
    );

    res.json({
      status: 'success',
      data: {
        sleep: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { sleepId } = req.params;

    // 验证 sleep 属于当前用户
    const check = await pool.query(
      `SELECT s.id FROM sleeps s
       INNER JOIN babies b ON s.baby_id = b.id
       WHERE s.id = $1 AND b.user_id = $2`,
      [sleepId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Sleep record not found', 404);
    }

    await pool.query('DELETE FROM sleeps WHERE id = $1', [sleepId]);

    res.json({
      status: 'success',
      message: 'Sleep record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

