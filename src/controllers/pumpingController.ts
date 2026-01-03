import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getPumpings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT p.* FROM pumpings p
      INNER JOIN babies b ON p.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND p.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND p.time >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND p.time <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY p.time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        pumpings: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPumping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, time, method, leftAmount, rightAmount, totalAmount, storageMethod, notes } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO pumpings (baby_id, time, method, left_amount, right_amount, total_amount, storage_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [babyId, time, method, leftAmount, rightAmount, totalAmount, storageMethod, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        pumping: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePumping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { pumpingId } = req.params;
    const { time, method, leftAmount, rightAmount, totalAmount, storageMethod, notes } = req.body;

    // 验证 pumping 属于当前用户
    const check = await pool.query(
      `SELECT p.id FROM pumpings p
       INNER JOIN babies b ON p.baby_id = b.id
       WHERE p.id = $1 AND b.user_id = $2`,
      [pumpingId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Pumping record not found', 404);
    }

    const result = await pool.query(
      `UPDATE pumpings
       SET time = COALESCE($1, time),
           method = COALESCE($2, method),
           left_amount = COALESCE($3, left_amount),
           right_amount = COALESCE($4, right_amount),
           total_amount = COALESCE($5, total_amount),
           storage_method = COALESCE($6, storage_method),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [time, method, leftAmount, rightAmount, totalAmount, storageMethod, notes, pumpingId]
    );

    res.json({
      status: 'success',
      data: {
        pumping: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePumping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { pumpingId } = req.params;

    // 验证 pumping 属于当前用户
    const check = await pool.query(
      `SELECT p.id FROM pumpings p
       INNER JOIN babies b ON p.baby_id = b.id
       WHERE p.id = $1 AND b.user_id = $2`,
      [pumpingId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Pumping record not found', 404);
    }

    await pool.query('DELETE FROM pumpings WHERE id = $1', [pumpingId]);

    res.json({
      status: 'success',
      message: 'Pumping record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

