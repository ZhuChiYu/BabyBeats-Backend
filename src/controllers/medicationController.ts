import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getMedications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, limit = 100 } = req.query;

    let query = `
      SELECT med.* FROM medications med
      INNER JOIN babies b ON med.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND med.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    query += ` ORDER BY med.medication_time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        medications: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { 
      id,
      babyId, 
      medicationTime, 
      medicationName, 
      dosage, 
      frequency, 
      startDate, 
      endDate, 
      administrationMethod, 
      visitId, 
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
      `INSERT INTO medications (
        id, baby_id, medication_time, medication_name, dosage, 
        frequency, start_date, end_date, administration_method, visit_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [id, babyId, medicationTime, medicationName, dosage, frequency, startDate, endDate, administrationMethod, visitId, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        medication: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { medicationId } = req.params;
    const { 
      medicationTime, 
      medicationName, 
      dosage, 
      frequency, 
      startDate, 
      endDate, 
      administrationMethod, 
      visitId, 
      notes 
    } = req.body;

    // 验证 medication 属于当前用户
    const check = await pool.query(
      `SELECT med.id FROM medications med
       INNER JOIN babies b ON med.baby_id = b.id
       WHERE med.id = $1 AND b.user_id = $2`,
      [medicationId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Medication record not found', 404);
    }

    const result = await pool.query(
      `UPDATE medications
       SET medication_time = COALESCE($1, medication_time),
           medication_name = COALESCE($2, medication_name),
           dosage = COALESCE($3, dosage),
           frequency = COALESCE($4, frequency),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           administration_method = COALESCE($7, administration_method),
           visit_id = COALESCE($8, visit_id),
           notes = COALESCE($9, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [medicationTime, medicationName, dosage, frequency, startDate, endDate, administrationMethod, visitId, notes, medicationId]
    );

    res.json({
      status: 'success',
      data: {
        medication: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { medicationId } = req.params;

    // 验证 medication 属于当前用户
    const check = await pool.query(
      `SELECT med.id FROM medications med
       INNER JOIN babies b ON med.baby_id = b.id
       WHERE med.id = $1 AND b.user_id = $2`,
      [medicationId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Medication record not found', 404);
    }

    await pool.query('DELETE FROM medications WHERE id = $1', [medicationId]);

    res.json({
      status: 'success',
      message: 'Medication record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

