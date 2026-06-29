const prisma = require("../../config/prisma");

exports.getDocs = async ({ search, category, status }) => {
  return prisma.apiDocumentation.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        category && category !== "ALL" ? { category } : {},
        status && status !== "ALL" ? { status } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};

exports.getDoc = async (id) => {
  return prisma.apiDocumentation.findUnique({
    where: { id },
  });
};

exports.createDoc = async (data) => {
  return prisma.apiDocumentation.create({
    data,
  });
};

exports.updateDoc = async (id, data) => {
  return prisma.apiDocumentation.update({
    where: { id },
    data,
  });
};

exports.deleteDoc = async (id) => {
  return prisma.apiDocumentation.delete({
    where: { id },
  });
};