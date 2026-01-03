import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getFeedings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT f.* FROM feedings f
      INNER JOIN babies b ON f.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND f.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND f.time >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND f.time <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY f.time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        feedings: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createFeeding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      id,
      babyId,
      type,
      time,
      milkAmount,
      leftDuration,
      rightDuration,
      milkBrand,
      notes,
    } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO feedings (id, baby_id, type, time, milk_amount, left_duration, right_duration, milk_brand, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, babyId, type, time, milkAmount, leftDuration, rightDuration, milkBrand, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        feeding: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFeeding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { feedingId } = req.params;
    const {
      type,
      time,
      amount,
      duration,
      leftDuration,
      rightDuration,
      note,
    } = req.body;

    // 验证 feeding 属于当前用户
    const check = await pool.query(
      `SELECT f.id FROM feedings f
       INNER JOIN babies b ON f.baby_id = b.id
       WHERE f.id = $1 AND b.user_id = $2`,
      [feedingId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Feeding not found', 404);
    }

    const result = await pool.query(
      `UPDATE feedings
       SET type = COALESCE($1, type),
           time = COALESCE($2, time),
           amount = COALESCE($3, amount),
           duration = COALESCE($4, duration),
           left_duration = COALESCE($5, left_duration),
           right_duration = COALESCE($6, right_duration),
           note = COALESCE($7, note),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [type, time, amount, duration, leftDuration, rightDuration, note, feedingId]
    );

    res.json({
      status: 'success',
      data: {
        feeding: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFeeding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { feedingId } = req.params;

    // 验证 feeding 属于当前用户
    const check = await pool.query(
      `SELECT f.id FROM feedings f
       INNER JOIN babies b ON f.baby_id = b.id
       WHERE f.id = $1 AND b.user_id = $2`,
      [feedingId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Feeding not found', 404);
    }

    await pool.query('DELETE FROM feedings WHERE id = $1', [feedingId]);

    res.json({
      status: 'success',
      message: 'Feeding deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

