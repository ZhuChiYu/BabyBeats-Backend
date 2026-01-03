import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getDiapers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT d.* FROM diapers d
      INNER JOIN babies b ON d.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND d.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND d.time >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND d.time <= $${paramIndex}`;
      params.push(new Date(endDate as string));
      paramIndex++;
    }

    query += ` ORDER BY d.time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        diapers: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDiaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, type, time, poopConsistency, poopColor, poopAmount, peeAmount, hasAbnormality, notes } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO diapers (baby_id, type, time, poop_consistency, poop_color, poop_amount, pee_amount, has_abnormality, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [babyId, type, time, poopConsistency, poopColor, poopAmount, peeAmount, hasAbnormality, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        diaper: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDiaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { diaperId } = req.params;
    const { type, time, poopConsistency, poopColor, poopAmount, peeAmount, hasAbnormality, notes } = req.body;

    // 验证 diaper 属于当前用户
    const check = await pool.query(
      `SELECT d.id FROM diapers d
       INNER JOIN babies b ON d.baby_id = b.id
       WHERE d.id = $1 AND b.user_id = $2`,
      [diaperId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Diaper record not found', 404);
    }

    const result = await pool.query(
      `UPDATE diapers
       SET type = COALESCE($1, type),
           time = COALESCE($2, time),
           poop_consistency = COALESCE($3, poop_consistency),
           poop_color = COALESCE($4, poop_color),
           poop_amount = COALESCE($5, poop_amount),
           pee_amount = COALESCE($6, pee_amount),
           has_abnormality = COALESCE($7, has_abnormality),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [type, time, poopConsistency, poopColor, poopAmount, peeAmount, hasAbnormality, notes, diaperId]
    );

    res.json({
      status: 'success',
      data: {
        diaper: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDiaper = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { diaperId } = req.params;

    // 验证 diaper 属于当前用户
    const check = await pool.query(
      `SELECT d.id FROM diapers d
       INNER JOIN babies b ON d.baby_id = b.id
       WHERE d.id = $1 AND b.user_id = $2`,
      [diaperId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Diaper record not found', 404);
    }

    await pool.query('DELETE FROM diapers WHERE id = $1', [diaperId]);

    res.json({
      status: 'success',
      message: 'Diaper record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

