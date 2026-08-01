import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import { CreateGearItemSchemaType } from "./gear.validation";
import httpStatus from "http-status";

export const gearServices = {
  createGearItem: async (user: any, gearPayload: CreateGearItemSchemaType) => {
    const existingGearItem = await prisma.gearItem.findFirst({
      where: {
        name: gearPayload.name,
        providerId: user.id,
      },
    });

    if (existingGearItem) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Gear item with the same name already exists for this provider.",
      );
    }
    const result = await prisma.gearItem.create({
      data: {
        ...gearPayload,
        providerId: user.id,
      },
    });
    return result;
  },
  getAllGear: async (query: any) => {
    const limit = Number(query.limit ?? 10);
    const page = Number(query.page ?? 1);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const [items, totalPostCount] = await Promise.all([
      prisma.gearItem.findMany({
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, email: true } },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.gearItem.count(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total: totalPostCount,
        totalPages: Math.ceil(totalPostCount / limit),
      },
    };
  },
  getGearById: async (id: string) => {
    const result = await prisma.gearItem.findUnique({
      where: {
        id,
      },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
    });
    return result;
  },
  deleteGear: async (id: string) => {
    const result = await prisma.gearItem.delete({
      where: {
        id,
      },
    });
    return result;
  },
};
