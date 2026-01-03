import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getBabies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const result = await pool.query(
      `SELECT id, user_id, name, gender, birthday, due_date, blood_type,
              birth_height, birth_weight, birth_head_circ, avatar, is_archived,
              created_at, updated_at, synced_at
       FROM babies
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      status: 'success',
      data: {
        babies: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBaby = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId } = req.params;

    const result = await pool.query(
      `SELECT id, user_id, name, gender, birthday, due_date, blood_type,
              birth_height, birth_weight, birth_head_circ, avatar, is_archived,
              created_at, updated_at, synced_at
       FROM babies
       WHERE id = $1 AND user_id = $2`,
      [babyId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        baby: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createBaby = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      id,
      name,
      gender,
      birthday,
      dueDate,
      bloodType,
      birthHeight,
      birthWeight,
      birthHeadCirc,
      avatar,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO babies (
        id, user_id, name, gender, birthday, due_date, blood_type,
        birth_height, birth_weight, birth_head_circ, avatar
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        userId,
        name,
        gender,
        birthday,
        dueDate,
        bloodType,
        birthHeight,
        birthWeight,
        birthHeadCirc,
        avatar,
      ]
    );

    res.status(201).json({
      status: 'success',
      data: {
        baby: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBaby = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId } = req.params;
    const {
      name,
      gender,
      birthday,
      dueDate,
      bloodType,
      birthHeight,
      birthWeight,
      birthHeadCirc,
      avatar,
      isArchived,
    } = req.body;

    // 验证权限
    const checkResult = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    const result = await pool.query(
      `UPDATE babies SET
        name = COALESCE($1, name),
        gender = COALESCE($2, gender),
        birthday = COALESCE($3, birthday),
        due_date = COALESCE($4, due_date),
        blood_type = COALESCE($5, blood_type),
        birth_height = COALESCE($6, birth_height),
        birth_weight = COALESCE($7, birth_weight),
        birth_head_circ = COALESCE($8, birth_head_circ),
        avatar = COALESCE($9, avatar),
        is_archived = COALESCE($10, is_archived)
      WHERE id = $11
      RETURNING *`,
      [
        name,
        gender,
        birthday,
        dueDate,
        bloodType,
        birthHeight,
        birthWeight,
        birthHeadCirc,
        avatar,
        isArchived,
        babyId,
      ]
    );

    res.json({
      status: 'success',
      data: {
        baby: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBaby = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { babyId } = req.params;

    // 验证权限
    const checkResult = await pool.query(
      'SELECT id FROM babies WHERE id = $1 AND user_id = $2',
      [babyId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Baby not found', 404);
    }

    await pool.query('DELETE FROM babies WHERE id = $1', [babyId]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

