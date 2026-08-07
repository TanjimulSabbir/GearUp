import httpStatus from "http-status";
import { CategoryCreateInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";

export const categoryService = {
  async getAll(query: any) {
    const limit = Number(query.limit ?? 10);
    const page = Number(query.page ?? 1);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const [categories, totalCategories] = await Promise.all([
      prisma.category.findMany({
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.category.count(),
    ]);

    return {
      items: categories,
      meta: {
        page,
        limit,
        total: totalCategories,
        totalPages: Math.ceil(totalCategories / limit),
      },
    };
  },

  async create(data: CategoryCreateInput | CategoryCreateInput[]) {
    if (Array.isArray(data)) {
      return this.createMany(data);
    }
    return this.createOne(data);
  },

  async createOne(data: CategoryCreateInput) {
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing)
      throw new AppError(
        409,
        "Category with the same name or slug already exists",
      );

    return prisma.category.create({ data: { ...data, slug: data.slug } });
  },

  async createMany(items: CategoryCreateInput[]) {
    const result = await prisma.category.createMany({
      data: items,
      skipDuplicates: true,
    });

    return {
      createdCount: result.count,
      attempted: items.length,
      data: result,
    };
  },

  async update(
    id: string,
    data: { name?: string; description?: string; slug?: string },
  ) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category)
      throw new AppError(httpStatus.NOT_FOUND, "Category not found");

    return prisma.category.update({
      where: { id },
      data,
    });
  },

  async remove(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category)
      throw new AppError(httpStatus.NOT_FOUND, "Category not found");

    const gearCount = await prisma.gearItem.count({
      where: { categoryId: id },
    });
    if (gearCount > 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot delete category with associated gear items",
      );
    }

    return await prisma.category.delete({ where: { id } });
  },
};
