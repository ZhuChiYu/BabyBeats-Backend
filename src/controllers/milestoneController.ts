import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getMilestones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId, limit = 100 } = req.query;

    let query = `
      SELECT m.* FROM milestones m
      INNER JOIN babies b ON m.baby_id = b.id
      WHERE b.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (babyId) {
      query += ` AND m.baby_id = $${paramIndex}`;
      params.push(babyId);
      paramIndex++;
    }

    query += ` ORDER BY m.time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: {
        milestones: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id, babyId, time, milestoneType, title, description, photoUrl } = req.body;

    // 验证 baby 属于当前用户
    const babyCheck = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (babyCheck.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO milestones (id, baby_id, time, milestone_type, title, description, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, babyId, time, milestoneType, title, description, photoUrl]
    );

    res.status(201).json({
      status: 'success',
      data: {
        milestone: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { milestoneId } = req.params;
    const { time, milestoneType, title, description, photoUrl } = req.body;

    // 验证 milestone 属于当前用户
    const check = await pool.query(
      `SELECT m.id FROM milestones m
       INNER JOIN babies b ON m.baby_id = b.id
       WHERE m.id = $1 AND b.user_id = $2`,
      [milestoneId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Milestone not found', 404);
    }

    const result = await pool.query(
      `UPDATE milestones
       SET time = COALESCE($1, time),
           milestone_type = COALESCE($2, milestone_type),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           photo_url = COALESCE($5, photo_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [time, milestoneType, title, description, photoUrl, milestoneId]
    );

    res.json({
      status: 'success',
      data: {
        milestone: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { milestoneId } = req.params;

    // 验证 milestone 属于当前用户
    const check = await pool.query(
      `SELECT m.id FROM milestones m
       INNER JOIN babies b ON m.baby_id = b.id
       WHERE m.id = $1 AND b.user_id = $2`,
      [milestoneId, userId]
    );

    if (check.rows.length === 0) {
      throw new AppError('Milestone not found', 404);
    }

    await pool.query('DELETE FROM milestones WHERE id = $1', [milestoneId]);

    res.json({
      status: 'success',
      message: 'Milestone deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

