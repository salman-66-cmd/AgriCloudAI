import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export class FarmsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const whereClause = user.role === 'ADMIN' ? {} : { ownerId: user.id };

      const farms = await prisma.farm.findMany({
        where: whereClause,
        include: {
          fields: {
            include: {
              crop: true,
              sensors: true,
              irrigationController: true,
            },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { farms },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const farm = await prisma.farm.findUnique({
        where: { id },
        include: {
          fields: {
            include: {
              crop: true,
              sensors: true,
              irrigationController: true,
              irrigationSettings: true,
            },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!farm) {
        throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
      }

      // Authorization / Ownership check
      if (user.role !== 'ADMIN' && farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to access this farm', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: { farm },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { name, location, area, soilType, description } = req.body;

      const farm = await prisma.farm.create({
        data: {
          name,
          location,
          area: parseFloat(area),
          soilType,
          description,
          ownerId: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entityType: 'FARM',
          entityId: farm.id,
          metadata: JSON.stringify({ name: farm.name }),
        },
      });

      res.status(201).json({
        success: true,
        data: { farm },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.farm.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.ownerId !== user.id) {
        throw new AppError('You do not have permission to modify this farm', 403, 'FORBIDDEN');
      }

      const { name, location, area, soilType, description } = req.body;

      const updated = await prisma.farm.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(location && { location }),
          ...(area !== undefined && { area: parseFloat(area) }),
          ...(soilType && { soilType }),
          ...(description !== undefined && { description }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'FARM',
          entityId: id,
          metadata: JSON.stringify(req.body),
        },
      });

      res.json({
        success: true,
        data: { farm: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.farm.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.ownerId !== user.id) {
        throw new AppError('You do not have permission to delete this farm', 403, 'FORBIDDEN');
      }

      await prisma.farm.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          entityType: 'FARM',
          entityId: id,
          metadata: JSON.stringify({ name: existing.name }),
        },
      });

      res.json({
        success: true,
        message: 'Farm and associated resources deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
