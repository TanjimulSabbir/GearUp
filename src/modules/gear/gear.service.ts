import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import { TGetAllGearQuery } from "./gear.validation";

export const gearServices = {
  async getAllGear(query: TGetAllGearQuery) {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      categoryId,
      brand,
      condition,
      minPrice,
      maxPrice,
      isAvailable,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GearItemWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = { equals: brand, mode: "insensitive" };
    if (condition) where.condition = condition;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.rentalPrice = {};
      if (minPrice !== undefined) where.rentalPrice.gte = minPrice;
      if (maxPrice !== undefined) where.rentalPrice.lte = maxPrice;
    }

    // Public browse defaults to available-only unless explicitly overridden
    where.isAvailable =
      isAvailable === undefined ? true : isAvailable === "true";

    const [items, total] = await Promise.all([
      prisma.gearItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.gearItem.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getGearById(id: string) {
    const result = await prisma.gearItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
    });

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Gear item not found.");
    }

    return result;
  },
};
