import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export class CropsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const crops = await prisma.crop.findMany({
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        data: { crops },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const crop = await prisma.crop.findUnique({
        where: { id },
        include: {
          fields: true,
        },
      });

      if (!crop) {
        throw new AppError('Crop not found', 404, 'CROP_NOT_FOUND');
      }

      res.json({
        success: true,
        data: { crop },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        variety,
        optimalMinMoisture,
        optimalMaxMoisture,
        optimalMinTemp,
        optimalMaxTemp,
        optimalMinPh,
        optimalMaxPh,
        growthDurationDays,
        description,
      } = req.body;

      const crop = await prisma.crop.create({
        data: {
          name,
          variety,
          optimalMinMoisture: parseFloat(optimalMinMoisture),
          optimalMaxMoisture: parseFloat(optimalMaxMoisture),
          optimalMinTemp: parseFloat(optimalMinTemp),
          optimalMaxTemp: parseFloat(optimalMaxTemp),
          optimalMinPh: parseFloat(optimalMinPh),
          optimalMaxPh: parseFloat(optimalMaxPh),
          growthDurationDays: growthDurationDays ? parseInt(growthDurationDays, 10) : null,
          description,
        },
      });

      res.status(201).json({
        success: true,
        data: { crop },
      });
    } catch (error) {
      next(error);
    }
  }
}
