import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getVaccines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, limit = 100 } = req.query;

    let query = `
      SELECT v.* FROM vaccines v
      INNER JOIN babies b ON v.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND v.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    query += ` ORDER BY v.vaccination_date DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        vaccines: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createVaccine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { 
      id,
      babyId, 
      vaccineName, 
      vaccinationDate, 
      doseNumber, 
      location, 
      batchNumber, 
      nextDate, 
      reminderEnabled, 
      notes 
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
      `INSERT INTO vaccines (
        id, baby_id, vaccine_name, vaccination_date, dose_number, 
        location, batch_number, next_date, reminder_enabled, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [id, babyId, vaccineName, vaccinationDate, doseNumber, location, batchNumber, nextDate, reminderEnabled, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        vaccine: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateVaccine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { vaccineId } = req.params;
    const { 
      vaccineName, 
      vaccinationDate, 
      doseNumber, 
      location, 
      batchNumber, 
      nextDate, 
      reminderEnabled, 
      notes 
    } = req.body;

    // 验证 vaccine 属于当前用户
    const check = await pool.query(
      `SELECT v.id FROM vaccines v
       INNER JOIN babies b ON v.baby_id = b.id
       WHERE v.id = $1 AND b.user_id = $2`,
      [vaccineId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Vaccine record not found', 404);
    }

    const result = await pool.query(
      `UPDATE vaccines
       SET vaccine_name = COALESCE($1, vaccine_name),
           vaccination_date = COALESCE($2, vaccination_date),
           dose_number = COALESCE($3, dose_number),
           location = COALESCE($4, location),
           batch_number = COALESCE($5, batch_number),
           next_date = COALESCE($6, next_date),
           reminder_enabled = COALESCE($7, reminder_enabled),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [vaccineName, vaccinationDate, doseNumber, location, batchNumber, nextDate, reminderEnabled, notes, vaccineId]
    );

    res.json({
      status: 'success',
      data: {
        vaccine: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVaccine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { vaccineId } = req.params;

    // 验证 vaccine 属于当前用户
    const check = await pool.query(
      `SELECT v.id FROM vaccines v
       INNER JOIN babies b ON v.baby_id = b.id
       WHERE v.id = $1 AND b.user_id = $2`,
      [vaccineId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Vaccine record not found', 404);
    }

    await pool.query('DELETE FROM vaccines WHERE id = $1', [vaccineId]);

    res.json({
      status: 'success',
      message: 'Vaccine record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

