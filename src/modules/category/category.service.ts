import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { slugify } from "./category.validation";

export const categoryService = {
  async getAll() {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  },

  async create(data: { name: string; description?: string }) {
    const slug = slugify(data.name);
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
    });
    if (existing) throw AppError.conflict("A category with this name already exists");

    return prisma.category.create({ data: { ...data, slug } });
  },

  async update(id: string, data: { name?: string; description?: string }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw AppError.notFound("Category not found");

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
    if (!category) throw AppError.notFound("Category not found");

    const gearCount = await prisma.gearItem.count({ where: { categoryId: id } });
    if (gearCount > 0) {
      throw AppError.conflict("Cannot delete a category that still has gear items");
    }

    await prisma.category.delete({ where: { id } });
  },
};
