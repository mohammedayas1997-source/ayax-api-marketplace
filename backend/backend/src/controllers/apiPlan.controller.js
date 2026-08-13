const prisma = require("../config/prisma");

const ALLOWED_STATUSES = [
  "ACTIVE",
  "DISABLED",
];

const ALLOWED_PACKAGE_TYPES = [
  "REGULAR",
  "STANDARD",
  "PREMIUM",
];

const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim()
    : "";

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

const parseMoney = (value) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return amount;
};

const serializePlan = (plan) => ({
  id: plan.id,
  serviceId: plan.serviceId,
  name: plan.name,
  code: plan.code,
  category: plan.category,
  costPrice: plan.costPrice,
  sellingPrice: plan.sellingPrice,
  profit:
    Number(plan.sellingPrice) -
    Number(plan.costPrice),
  status: plan.status,
  description: plan.description,
  features: plan.features,
  metadata: plan.metadata,
  packageType: plan.packageType,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,

  service: plan.service
    ? {
        id: plan.service.id,
        name: plan.service.name,
        slug: plan.service.slug,
        code: plan.service.code,
        category: plan.service.category,
        status: plan.service.status,
        endpoint: plan.service.endpoint,
        method: plan.service.method,

        provider: plan.service.provider
          ? {
              id: plan.service.provider.id,
              name: plan.service.provider.name,
              slug: plan.service.provider.slug,
              code: plan.service.provider.code,
              category:
                plan.service.provider.category,
              status:
                plan.service.provider.status,
            }
          : null,
      }
    : null,
});

const getPlanInclude = () => ({
  service: {
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          code: true,
          category: true,
          status: true,
        },
      },
    },
  },
});

const createAuditLog = async ({
  req,
  action,
  description,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        userEmail:
          req.user?.email || null,
        action,
        module: "API_PLANS",
        description,
        ipAddress: req.ip || null,
      },
    });
  } catch (error) {
    console.error(
      "API plan audit log error:",
      error.message
    );
  }
};

const handlePrismaError = (
  error,
  res,
  fallbackMessage
) => {
  if (error?.code === "P2002") {
    const target = Array.isArray(
      error.meta?.target
    )
      ? error.meta.target.join(", ")
      : "unique field";

    return res.status(409).json({
      success: false,
      message: `A plan with this ${target} already exists.`,
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "API plan not found.",
    });
  }

  if (error?.code === "P2003") {
    return res.status(400).json({
      success: false,
      message:
        "The selected API service does not exist.",
    });
  }

  console.error(
    fallbackMessage,
    error
  );

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/**
 * GET /api/v1/plans
 *
 * Query parameters:
 * status=ACTIVE
 * category=DATA
 * packageType=REGULAR
 * serviceId=...
 * search=MTN
 */
exports.getPlans = async (
  req,
  res
) => {
  try {
    const {
      status,
      category,
      packageType,
      serviceId,
      search,
    } = req.query;

    const where = {};

    if (status) {
      const normalizedStatus =
        normalizeUppercase(status);

      if (
        !ALLOWED_STATUSES.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be ACTIVE or DISABLED.",
        });
      }

      where.status =
        normalizedStatus;
    }

    if (category) {
      where.category =
        normalizeUppercase(category);
    }

    if (packageType) {
      const normalizedPackage =
        normalizeUppercase(packageType);

      if (
        !ALLOWED_PACKAGE_TYPES.includes(
          normalizedPackage
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Package type must be REGULAR, STANDARD or PREMIUM.",
        });
      }

      where.packageType =
        normalizedPackage;
    }

    if (serviceId) {
      where.serviceId =
        normalizeText(serviceId);
    }

    if (search) {
      const searchText =
        normalizeText(search);

      where.OR = [
        {
          name: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          code: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          service: {
            name: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const plans =
      await prisma.apiPlan.findMany({
        where,
        include: getPlanInclude(),
        orderBy: [
          {
            category: "asc",
          },
          {
            packageType: "asc",
          },
          {
            sellingPrice: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      count: plans.length,
      plans: plans.map(
        serializePlan
      ),
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to retrieve API plans."
    );
  }
};

/**
 * GET /api/v1/plans/:id
 */
exports.getPlanById = async (
  req,
  res
) => {
  try {
    const plan =
      await prisma.apiPlan.findUnique({
        where: {
          id: req.params.id,
        },
        include: getPlanInclude(),
      });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "API plan not found.",
      });
    }

    return res.status(200).json({
      success: true,
      plan: serializePlan(plan),
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to retrieve API plan."
    );
  }
};

/**
 * POST /api/v1/plans
 */
exports.createPlan = async (
  req,
  res
) => {
  try {
    const {
      serviceId,
      name,
      code,
      category,
      costPrice,
      sellingPrice,
      status = "ACTIVE",
      description,
      features,
      metadata,
      packageType = "REGULAR",
    } = req.body;

    const cleanServiceId =
      normalizeText(serviceId);

    const cleanName =
      normalizeText(name);

    const cleanCode =
      normalizeUppercase(code);

    const cleanCategory =
      normalizeUppercase(category);

    const normalizedStatus =
      normalizeUppercase(status);

    const normalizedPackageType =
      normalizeUppercase(packageType);

    const parsedCostPrice =
      parseMoney(costPrice);

    const parsedSellingPrice =
      parseMoney(sellingPrice);

    if (!cleanServiceId) {
      return res.status(400).json({
        success: false,
        message:
          "serviceId is required.",
      });
    }

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message:
          "Plan name is required.",
      });
    }

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        message:
          "Plan code is required.",
      });
    }

    if (!cleanCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Plan category is required.",
      });
    }

    if (
      parsedCostPrice === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cost price must be a valid non-negative number.",
      });
    }

    if (
      parsedSellingPrice === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price must be a valid non-negative number.",
      });
    }

    if (
      parsedSellingPrice <
      parsedCostPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price cannot be lower than cost price.",
      });
    }

    if (
      !ALLOWED_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be ACTIVE or DISABLED.",
      });
    }

    if (
      !ALLOWED_PACKAGE_TYPES.includes(
        normalizedPackageType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Package type must be REGULAR, STANDARD or PREMIUM.",
      });
    }

    const service =
      await prisma.apiService.findUnique({
        where: {
          id: cleanServiceId,
        },
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
        },
      });

    if (!service) {
      return res.status(404).json({
        success: false,
        message:
          "Selected API service was not found.",
      });
    }

    const existingCode =
      await prisma.apiPlan.findUnique({
        where: {
          code: cleanCode,
        },
        select: {
          id: true,
        },
      });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message:
          "A plan with this code already exists.",
      });
    }

    const plan =
      await prisma.apiPlan.create({
        data: {
          serviceId:
            cleanServiceId,
          name: cleanName,
          code: cleanCode,
          category:
            cleanCategory,
          costPrice:
            parsedCostPrice,
          sellingPrice:
            parsedSellingPrice,
          status:
            normalizedStatus,
          description:
            normalizeText(
              description
            ) || null,
          features:
            features ?? null,
          metadata:
            metadata ?? null,
          packageType:
            normalizedPackageType,
        },
        include: getPlanInclude(),
      });

    await createAuditLog({
      req,
      action: "CREATE_API_PLAN",
      description: `Created API plan ${plan.name} (${plan.code})`,
    });

    return res.status(201).json({
      success: true,
      message:
        "API plan created successfully.",
      plan: serializePlan(plan),
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to create API plan."
    );
  }
};

/**
 * PATCH /api/v1/plans/:id
 */
exports.updatePlan = async (
  req,
  res
) => {
  try {
    const planId =
      req.params.id;

    const existingPlan =
      await prisma.apiPlan.findUnique({
        where: {
          id: planId,
        },
      });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message:
          "API plan not found.",
      });
    }

    const data = {};

    if (
      req.body.serviceId !==
      undefined
    ) {
      const serviceId =
        normalizeText(
          req.body.serviceId
        );

      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message:
            "serviceId cannot be empty.",
        });
      }

      const service =
        await prisma.apiService.findUnique({
          where: {
            id: serviceId,
          },
          select: {
            id: true,
          },
        });

      if (!service) {
        return res.status(404).json({
          success: false,
          message:
            "Selected API service was not found.",
        });
      }

      data.serviceId = serviceId;
    }

    if (
      req.body.name !== undefined
    ) {
      const name =
        normalizeText(req.body.name);

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Plan name cannot be empty.",
        });
      }

      data.name = name;
    }

    if (
      req.body.code !== undefined
    ) {
      const code =
        normalizeUppercase(
          req.body.code
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Plan code cannot be empty.",
        });
      }

      const duplicatePlan =
        await prisma.apiPlan.findFirst({
          where: {
            code,
            NOT: {
              id: planId,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicatePlan) {
        return res.status(409).json({
          success: false,
          message:
            "Another plan already uses this code.",
        });
      }

      data.code = code;
    }

    if (
      req.body.category !==
      undefined
    ) {
      const category =
        normalizeUppercase(
          req.body.category
        );

      if (!category) {
        return res.status(400).json({
          success: false,
          message:
            "Plan category cannot be empty.",
        });
      }

      data.category = category;
    }

    if (
      req.body.costPrice !==
      undefined
    ) {
      const costPrice =
        parseMoney(
          req.body.costPrice
        );

      if (costPrice === null) {
        return res.status(400).json({
          success: false,
          message:
            "Cost price must be a valid non-negative number.",
        });
      }

      data.costPrice =
        costPrice;
    }

    if (
      req.body.sellingPrice !==
      undefined
    ) {
      const sellingPrice =
        parseMoney(
          req.body.sellingPrice
        );

      if (
        sellingPrice === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selling price must be a valid non-negative number.",
        });
      }

      data.sellingPrice =
        sellingPrice;
    }

    const finalCostPrice =
      data.costPrice ??
      existingPlan.costPrice;

    const finalSellingPrice =
      data.sellingPrice ??
      existingPlan.sellingPrice;

    if (
      finalSellingPrice <
      finalCostPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price cannot be lower than cost price.",
      });
    }

    if (
      req.body.status !== undefined
    ) {
      const status =
        normalizeUppercase(
          req.body.status
        );

      if (
        !ALLOWED_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be ACTIVE or DISABLED.",
        });
      }

      data.status = status;
    }

    if (
      req.body.packageType !==
      undefined
    ) {
      const packageType =
        normalizeUppercase(
          req.body.packageType
        );

      if (
        !ALLOWED_PACKAGE_TYPES.includes(
          packageType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Package type must be REGULAR, STANDARD or PREMIUM.",
        });
      }

      data.packageType =
        packageType;
    }

    if (
      req.body.description !==
      undefined
    ) {
      data.description =
        normalizeText(
          req.body.description
        ) || null;
    }

    if (
      req.body.features !==
      undefined
    ) {
      data.features =
        req.body.features;
    }

    if (
      req.body.metadata !==
      undefined
    ) {
      data.metadata =
        req.body.metadata;
    }

    if (
      Object.keys(data).length ===
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields were provided for update.",
      });
    }

    const plan =
      await prisma.apiPlan.update({
        where: {
          id: planId,
        },
        data,
        include: getPlanInclude(),
      });

    await createAuditLog({
      req,
      action: "UPDATE_API_PLAN",
      description: `Updated API plan ${plan.name} (${plan.code})`,
    });

    return res.status(200).json({
      success: true,
      message:
        "API plan updated successfully.",
      plan: serializePlan(plan),
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to update API plan."
    );
  }
};

/**
 * PATCH /api/v1/plans/:id/status
 */
exports.changeStatus = async (
  req,
  res
) => {
  try {
    const status =
      normalizeUppercase(
        req.body.status
      );

    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be ACTIVE or DISABLED.",
      });
    }

    const existingPlan =
      await prisma.apiPlan.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message:
          "API plan not found.",
      });
    }

    const plan =
      await prisma.apiPlan.update({
        where: {
          id: existingPlan.id,
        },
        data: {
          status,
        },
        include: getPlanInclude(),
      });

    await createAuditLog({
      req,
      action:
        "CHANGE_API_PLAN_STATUS",
      description: `Changed API plan ${plan.code} status to ${status}`,
    });

    return res.status(200).json({
      success: true,
      message: `API plan ${status.toLowerCase()} successfully.`,
      plan: serializePlan(plan),
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to change API plan status."
    );
  }
};

/**
 * DELETE /api/v1/plans/:id
 */
exports.deletePlan = async (
  req,
  res
) => {
  try {
    const plan =
      await prisma.apiPlan.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "API plan not found.",
      });
    }

    await prisma.apiPlan.delete({
      where: {
        id: plan.id,
      },
    });

    await createAuditLog({
      req,
      action: "DELETE_API_PLAN",
      description: `Deleted API plan ${plan.name} (${plan.code})`,
    });

    return res.status(200).json({
      success: true,
      message:
        "API plan deleted successfully.",
    });
  } catch (error) {
    return handlePrismaError(
      error,
      res,
      "Unable to delete API plan."
    );
  }
};