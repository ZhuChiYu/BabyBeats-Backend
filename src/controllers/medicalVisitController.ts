import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getMedicalVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, limit = 100 } = req.query;

    let query = `
      SELECT mv.* FROM medical_visits mv
      INNER JOIN babies b ON mv.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND mv.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    query += ` ORDER BY mv.visit_time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        medicalVisits: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createMedicalVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { 
      id,
      babyId, 
      visitTime, 
      hospital, 
      department, 
      doctorName, 
      symptoms, 
      diagnosis, 
      doctorAdvice, 
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
      `INSERT INTO medical_visits (
        id, baby_id, visit_time, hospital, department, 
        doctor_name, symptoms, diagnosis, doctor_advice, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [id, babyId, visitTime, hospital, department, doctorName, symptoms, diagnosis, doctorAdvice, notes]
    );

    res.status(201).json({
      status: 'success',
      data: {
        medicalVisit: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicalVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { visitId } = req.params;
    const { 
      visitTime, 
      hospital, 
      department, 
      doctorName, 
      symptoms, 
      diagnosis, 
      doctorAdvice, 
      notes 
    } = req.body;

    // 验证 medical visit 属于当前用户
    const check = await pool.query(
      `SELECT mv.id FROM medical_visits mv
       INNER JOIN babies b ON mv.baby_id = b.id
       WHERE mv.id = $1 AND b.user_id = $2`,
      [visitId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Medical visit not found', 404);
    }

    const result = await pool.query(
      `UPDATE medical_visits
       SET visit_time = COALESCE($1, visit_time),
           hospital = COALESCE($2, hospital),
           department = COALESCE($3, department),
           doctor_name = COALESCE($4, doctor_name),
           symptoms = COALESCE($5, symptoms),
           diagnosis = COALESCE($6, diagnosis),
           doctor_advice = COALESCE($7, doctor_advice),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [visitTime, hospital, department, doctorName, symptoms, diagnosis, doctorAdvice, notes, visitId]
    );

    res.json({
      status: 'success',
      data: {
        medicalVisit: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicalVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { visitId } = req.params;

    // 验证 medical visit 属于当前用户
    const check = await pool.query(
      `SELECT mv.id FROM medical_visits mv
       INNER JOIN babies b ON mv.baby_id = b.id
       WHERE mv.id = $1 AND b.user_id = $2`,
      [visitId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Medical visit not found', 404);
    }

    await pool.query('DELETE FROM medical_visits WHERE id = $1', [visitId]);

    res.json({
      status: 'success',
      message: 'Medical visit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

