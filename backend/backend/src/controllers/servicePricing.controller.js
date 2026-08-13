const prisma = require("../config/prisma");

const ALLOWED_TIERS = [
  "REGULAR",
  "STANDARD",
  "PREMIUM",
];

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeUppercase = (value) =>
  normalizeText(value).toUpperCase();

const parseAmount = (value) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return Number(amount.toFixed(2));
};

const serializePricing = (item) => ({
  id: item.id,
  serviceCode: item.serviceCode,
  serviceName: item.serviceName,
  category: item.category,
  tier: item.tier,
  costPrice: Number(item.costPrice || 0),
  sellingPrice: Number(
    item.sellingPrice || 0
  ),
  currency: item.currency,
  enabled: item.enabled,
  features: item.features,
  metadata: item.metadata,
  createdBy: item.createdBy,
  updatedBy: item.updatedBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

/* ======================================================
   DEVELOPER: GET ALL ENABLED PLANS GROUPED BY CATEGORY

   GET /api/v1/service-pricing
====================================================== */

exports.getPublicPricing = async (
  req,
  res
) => {
  try {
    const pricing =
      await prisma.servicePricing.findMany({
        where: {
          enabled: true,
        },
        orderBy: [
          {
            category: "asc",
          },
          {
            tier: "asc",
          },
          {
            sellingPrice: "asc",
          },
        ],
      });

    const groupedPricing =
      pricing.reduce(
        (groups, item) => {
          const category =
            item.category.toUpperCase();

          if (!groups[category]) {
            groups[category] = [];
          }

          groups[category].push(
            serializePricing(item)
          );

          return groups;
        },
        {}
      );

    const categories =
      Object.entries(groupedPricing).map(
        ([category, plans]) => ({
          category,
          title:
            category
              .replaceAll("_", " ")
              .replace(
                /\b\w/g,
                (character) =>
                  character.toUpperCase()
              ),
          count: plans.length,
          plans,
        })
      );

    return res.status(200).json({
      success: true,
      message:
        "Service prices retrieved successfully.",
      pricing:
        pricing.map(serializePricing),
      groupedPricing,
      categories,
    });
  } catch (error) {
    console.error(
      "Get public pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve service prices.",
    });
  }
};

/* ======================================================
   ADMIN: GET ALL PRICING

   GET /api/v1/admin/service-pricing
====================================================== */

exports.getAdminPricing = async (
  req,
  res
) => {
  try {
    const {
      category,
      tier,
      enabled,
      search,
    } = req.query;

    const where = {};

    if (category) {
      where.category =
        normalizeUppercase(category);
    }

    if (tier) {
      const normalizedTier =
        normalizeUppercase(tier);

      if (
        !ALLOWED_TIERS.includes(
          normalizedTier
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tier must be REGULAR, STANDARD or PREMIUM.",
        });
      }

      where.tier = normalizedTier;
    }

    if (enabled !== undefined) {
      where.enabled =
        String(enabled).toLowerCase() ===
        "true";
    }

    if (search) {
      const searchValue =
        normalizeText(search);

      where.OR = [
        {
          serviceName: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          serviceCode: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
      ];
    }

    const pricing =
      await prisma.servicePricing.findMany({
        where,
        orderBy: [
          {
            category: "asc",
          },
          {
            tier: "asc",
          },
          {
            sellingPrice: "asc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      count: pricing.length,
      pricing:
        pricing.map(serializePricing),
    });
  } catch (error) {
    console.error(
      "Get admin pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve service pricing.",
    });
  }
};

/* ======================================================
   ADMIN: CREATE PLAN

   POST /api/v1/admin/service-pricing
====================================================== */

exports.createPricing = async (
  req,
  res
) => {
  try {
    const {
      serviceCode,
      serviceName,
      category,
      tier = "REGULAR",
      costPrice = 0,
      sellingPrice,
      currency = "NGN",
      enabled = true,
      features,
      metadata,
    } = req.body;

    const cleanCode =
      normalizeUppercase(serviceCode);

    const cleanName =
      normalizeText(serviceName);

    const cleanCategory =
      normalizeUppercase(category);

    const normalizedTier =
      normalizeUppercase(tier);

    const parsedCostPrice =
      parseAmount(costPrice);

    const parsedSellingPrice =
      parseAmount(sellingPrice);

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        message:
          "Service code is required.",
      });
    }

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message:
          "Service name is required.",
      });
    }

    if (!cleanCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Service category is required.",
      });
    }

    if (
      !ALLOWED_TIERS.includes(
        normalizedTier
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tier must be REGULAR, STANDARD or PREMIUM.",
      });
    }

    if (parsedCostPrice === null) {
      return res.status(400).json({
        success: false,
        message:
          "Cost price must be a valid amount.",
      });
    }

    if (
      parsedSellingPrice === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price must be a valid amount.",
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

    const pricing =
      await prisma.servicePricing.create({
        data: {
          serviceCode: cleanCode,
          serviceName: cleanName,
          category: cleanCategory,
          tier: normalizedTier,
          costPrice:
            parsedCostPrice,
          sellingPrice:
            parsedSellingPrice,
          currency:
            normalizeUppercase(
              currency
            ) || "NGN",
          enabled:
            Boolean(enabled),
          features:
            features ?? null,
          metadata:
            metadata ?? null,
          createdBy:
            req.user.id,
          updatedBy:
            req.user.id,
        },
      });

    await prisma.auditLog
      .create({
        data: {
          userId: req.user.id,
          userEmail:
            req.user.email || null,
          action:
            "CREATE_SERVICE_PRICING",
          module:
            "SERVICE_PRICING",
          description:
            `Created ${cleanName} pricing at ${parsedSellingPrice} NGN`,
          ipAddress: req.ip || null,
        },
      })
      .catch(console.error);

    return res.status(201).json({
      success: true,
      message:
        "Service pricing created successfully.",
      pricing:
        serializePricing(pricing),
    });
  } catch (error) {
    console.error(
      "Create pricing error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "This service code and tier already exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create service pricing.",
    });
  }
};

/* ======================================================
   ADMIN: UPDATE PLAN

   PATCH /api/v1/admin/service-pricing/:id
====================================================== */

exports.updatePricing = async (
  req,
  res
) => {
  try {
    const pricingId =
      String(req.params.id || "").trim();

    const existing =
      await prisma.servicePricing.findUnique({
        where: {
          id: pricingId,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "Service pricing not found.",
      });
    }

    const data = {};

    if (
      req.body.serviceCode !==
      undefined
    ) {
      const serviceCode =
        normalizeUppercase(
          req.body.serviceCode
        );

      if (!serviceCode) {
        return res.status(400).json({
          success: false,
          message:
            "Service code cannot be empty.",
        });
      }

      data.serviceCode =
        serviceCode;
    }

    if (
      req.body.serviceName !==
      undefined
    ) {
      const serviceName =
        normalizeText(
          req.body.serviceName
        );

      if (!serviceName) {
        return res.status(400).json({
          success: false,
          message:
            "Service name cannot be empty.",
        });
      }

      data.serviceName =
        serviceName;
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
            "Category cannot be empty.",
        });
      }

      data.category = category;
    }

    if (req.body.tier !== undefined) {
      const tier =
        normalizeUppercase(
          req.body.tier
        );

      if (
        !ALLOWED_TIERS.includes(tier)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tier must be REGULAR, STANDARD or PREMIUM.",
        });
      }

      data.tier = tier;
    }

    if (
      req.body.costPrice !==
      undefined
    ) {
      const costPrice =
        parseAmount(
          req.body.costPrice
        );

      if (costPrice === null) {
        return res.status(400).json({
          success: false,
          message:
            "Cost price must be valid.",
        });
      }

      data.costPrice = costPrice;
    }

    if (
      req.body.sellingPrice !==
      undefined
    ) {
      const sellingPrice =
        parseAmount(
          req.body.sellingPrice
        );

      if (
        sellingPrice === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selling price must be valid.",
        });
      }

      data.sellingPrice =
        sellingPrice;
    }

    const finalCostPrice =
      data.costPrice ??
      existing.costPrice;

    const finalSellingPrice =
      data.sellingPrice ??
      existing.sellingPrice;

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
      req.body.currency !==
      undefined
    ) {
      data.currency =
        normalizeUppercase(
          req.body.currency
        ) || "NGN";
    }

    if (
      req.body.enabled !==
      undefined
    ) {
      data.enabled =
        Boolean(req.body.enabled);
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

    data.updatedBy = req.user.id;

    const pricing =
      await prisma.servicePricing.update({
        where: {
          id: existing.id,
        },
        data,
      });

    return res.status(200).json({
      success: true,
      message:
        "Service pricing updated successfully.",
      pricing:
        serializePricing(pricing),
    });
  } catch (error) {
    console.error(
      "Update pricing error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Another pricing plan already uses this service code and tier.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update service pricing.",
    });
  }
};

/* ======================================================
   ADMIN: ENABLE OR DISABLE PLAN

   PATCH /api/v1/admin/service-pricing/:id/status
====================================================== */

exports.changePricingStatus =
  async (req, res) => {
    try {
      const pricing =
        await prisma.servicePricing.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!pricing) {
        return res.status(404).json({
          success: false,
          message:
            "Service pricing not found.",
        });
      }

      const enabled =
        typeof req.body.enabled ===
        "boolean"
          ? req.body.enabled
          : !pricing.enabled;

      const updated =
        await prisma.servicePricing.update({
          where: {
            id: pricing.id,
          },
          data: {
            enabled,
            updatedBy:
              req.user.id,
          },
        });

      return res.status(200).json({
        success: true,
        message: enabled
          ? "Pricing plan enabled successfully."
          : "Pricing plan disabled successfully.",
        pricing:
          serializePricing(updated),
      });
    } catch (error) {
      console.error(
        "Change pricing status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to change pricing status.",
      });
    }
  };

/* ======================================================
   ADMIN: DELETE PLAN

   DELETE /api/v1/admin/service-pricing/:id
====================================================== */

exports.deletePricing = async (
  req,
  res
) => {
  try {
    const pricing =
      await prisma.servicePricing.findUnique({
        where: {
          id: req.params.id,
        },
      });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message:
          "Service pricing not found.",
      });
    }

    await prisma.servicePricing.delete({
      where: {
        id: pricing.id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Service pricing deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete service pricing.",
    });
  }
};