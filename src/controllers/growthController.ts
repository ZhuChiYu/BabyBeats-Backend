import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getGrowthRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT g.* FROM growth_records g
      INNER JOIN babies b ON g.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND g.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND g.date >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND g.date <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY g.date DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        growthRecords: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createGrowthRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id, babyId, date, height, weight, headCirc, temperature, bmi, notes } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO growth_records (id, baby_id, date, height, weight, head_circ, temperature, bmi, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, babyId, date, height, weight, headCirc, temperature, bmi, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        growthRecord: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGrowthRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { growthId } = req.params;
    const { date, height, weight, headCirc, temperature, bmi, notes } = req.body;

    // 验证 growth record 属于当前用户
    const check = await pool.query(
      `SELECT g.id FROM growth_records g
       INNER JOIN babies b ON g.baby_id = b.id
       WHERE g.id = $1 AND b.user_id = $2`,
      [growthId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Growth record not found', 404);
    }

    const result = await pool.query(
      `UPDATE growth_records
       SET date = COALESCE($1, date),
           height = COALESCE($2, height),
           weight = COALESCE($3, weight),
           head_circ = COALESCE($4, head_circ),
           temperature = COALESCE($5, temperature),
           bmi = COALESCE($6, bmi),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [date, height, weight, headCirc, temperature, bmi, notes, growthId]
    );

    res.json({
      status: 'success',
      data: {
        growthRecord: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGrowthRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { growthId } = req.params;

    // 验证 growth record 属于当前用户
    const check = await pool.query(
      `SELECT g.id FROM growth_records g
       INNER JOIN babies b ON g.baby_id = b.id
       WHERE g.id = $1 AND b.user_id = $2`,
      [growthId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Growth record not found', 404);
    }

    await pool.query('DELETE FROM growth_records WHERE id = $1', [growthId]);

    res.json({
      status: 'success',
      message: 'Growth record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

