import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import { slugify } from "./category.validation";
import httpStatus from "http-status";

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

  async create(data: { name: string; description?: string }) {
    const slug = slugify(data.name);
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
    });
    if (existing)
      throw new AppError(
        409,
        "Category with the same name or slug already exists",
      );

    return prisma.category.create({ data: { ...data, slug } });
  },

  async update(id: string, data: { name?: string; description?: string }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category)
      throw new AppError(httpStatus.NOT_FOUND, "Category not found");

    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(data.name ? { slug: slugify(data.name) } : {}),
      },
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
