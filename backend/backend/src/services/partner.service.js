const prisma = require("../config/prisma");

const {
  encryptCredential,
  decryptCredential,
} = require("./credentialEncryption.service");

const normalizeCategory = (value = "OTHER") => {
  const category = String(value)
    .trim()
    .toUpperCase();

  const allowed = [
    "GSM",
    "IDENTITY",
    "UTILITY",
    "FINANCE",
    "AI",
    "EDUCATION",
    "OTHER",
  ];

  return allowed.includes(category)
    ? category
    : "OTHER";
};

const normalizeStatus = (value = "ACTIVE") => {
  const status = String(value)
    .trim()
    .toUpperCase();

  const allowed = [
    "ACTIVE",
    "DISABLED",
    "MAINTENANCE",
  ];

  return allowed.includes(status)
    ? status
    : "DISABLED";
};

const createSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const credentialTypeMap = {
  apiKey: "API_KEY",
  secretKey: "SECRET_KEY",
  username: "USERNAME",
  password: "PASSWORD",
};

const serializePartner = (partner) => {
  if (!partner) return null;

  return {
    id: partner.id,
    name: partner.name,
    code: partner.code,
    slug: partner.slug,
    category: partner.category,
    description: partner.description,
    baseUrl: partner.baseUrl,
    webhookUrl: partner.webhookUrl,
    status: partner.status,
    priority: partner.priority,
    isFallback: partner.isFallback,
    timeoutMs: partner.timeoutMs,
    failureCount: partner.failureCount,
    successCount: partner.successCount,
    lastFailureAt: partner.lastFailureAt,
    lastSuccessAt: partner.lastSuccessAt,
    lastHealthCheckAt: partner.lastHealthCheckAt,

    hasApiKey:
      partner.credentials?.some(
        (item) => item.name === "apiKey" && item.active
      ) || false,

    hasSecretKey:
      partner.credentials?.some(
        (item) =>
          item.name === "secretKey" && item.active
      ) || false,

    hasUsername:
      partner.credentials?.some(
        (item) =>
          item.name === "username" && item.active
      ) || false,

    hasPassword:
      partner.credentials?.some(
        (item) =>
          item.name === "password" && item.active
      ) || false,

    services:
      partner.services?.map((service) => ({
        id: service.id,
        name: service.name,
        code: service.code,
        slug: service.slug,
        category: service.category,
        status: service.status,
      })) || [],

    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
};

const saveCredential = async ({
  providerId,
  name,
  value,
}) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const encrypted = encryptCredential(value);

  return prisma.apiProviderCredential.upsert({
    where: {
      providerId_name: {
        providerId,
        name,
      },
    },
    update: {
      type:
        credentialTypeMap[name] || "CUSTOM",
      encryptedValue:
        encrypted.encryptedValue,
      initializationVector:
        encrypted.initializationVector,
      authenticationTag:
        encrypted.authenticationTag,
      active: true,
    },
    create: {
      providerId,
      name,
      type:
        credentialTypeMap[name] || "CUSTOM",
      encryptedValue:
        encrypted.encryptedValue,
      initializationVector:
        encrypted.initializationVector,
      authenticationTag:
        encrypted.authenticationTag,
      active: true,
    },
  });
};

const saveCredentials = async (
  providerId,
  credentials = {}
) => {
  const entries = Object.entries(credentials);

  for (const [name, value] of entries) {
    await saveCredential({
      providerId,
      name,
      value,
    });
  }
};

const listPartners = async ({
  category,
  status,
  search,
} = {}) => {
  const where = {};

  if (category) {
    where.category =
      normalizeCategory(category);
  }

  if (status) {
    where.status =
      normalizeStatus(status);
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        code: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        baseUrl: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const partners =
    await prisma.apiProvider.findMany({
      where,
      include: {
        credentials: {
          where: {
            active: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            active: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            code: true,
            slug: true,
            category: true,
            status: true,
          },
        },
      },
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  return partners.map(serializePartner);
};

const getPartnerById = async (id) => {
  const partner =
    await prisma.apiProvider.findUnique({
      where: {
        id,
      },
      include: {
        credentials: {
          where: {
            active: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            active: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            code: true,
            slug: true,
            category: true,
            status: true,
          },
        },
      },
    });

  return serializePartner(partner);
};

const createPartner = async (payload) => {
  const name = String(payload.name || "").trim();

  const code = String(payload.code || "")
    .trim()
    .toUpperCase();

  if (!name) {
    throw new Error("Partner name is required");
  }

  if (!code) {
    throw new Error("Partner code is required");
  }

  if (!payload.baseUrl) {
    throw new Error("API base URL is required");
  }

  const slug =
    createSlug(payload.slug || code || name);

  const duplicate =
    await prisma.apiProvider.findFirst({
      where: {
        OR: [
          {
            code,
          },
          {
            slug,
          },
        ],
      },
    });

  if (duplicate) {
    throw new Error(
      "Partner code or slug already exists"
    );
  }

  const partner =
    await prisma.apiProvider.create({
      data: {
        name,
        code,
        slug,
        category: normalizeCategory(
          payload.category
        ),
        status: normalizeStatus(
          payload.status
        ),
        description:
          payload.description || null,
        baseUrl:
          String(payload.baseUrl).trim(),
        webhookUrl:
          payload.webhookUrl || null,
        priority: Number(
          payload.priority || 1
        ),
        isFallback: Boolean(
          payload.isFallback
        ),
        timeoutMs: Number(
          payload.timeoutMs || 30000
        ),
      },
    });

  await saveCredentials(partner.id, {
    apiKey: payload.apiKey,
    secretKey: payload.secretKey,
    username: payload.username,
    password: payload.password,
  });

  return getPartnerById(partner.id);
};

const updatePartner = async (
  id,
  payload
) => {
  const existing =
    await prisma.apiProvider.findUnique({
      where: {
        id,
      },
    });

  if (!existing) {
    throw new Error("Partner not found");
  }

  const updateData = {};

  if (payload.name !== undefined) {
    updateData.name = String(
      payload.name
    ).trim();
  }

  if (payload.code !== undefined) {
    const code = String(payload.code)
      .trim()
      .toUpperCase();

    const duplicate =
      await prisma.apiProvider.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      throw new Error(
        "Partner code already exists"
      );
    }

    updateData.code = code;
  }

  if (payload.slug !== undefined) {
    const slug = createSlug(
      payload.slug
    );

    const duplicate =
      await prisma.apiProvider.findFirst({
        where: {
          slug,
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      throw new Error(
        "Partner slug already exists"
      );
    }

    updateData.slug = slug;
  }

  if (payload.category !== undefined) {
    updateData.category =
      normalizeCategory(
        payload.category
      );
  }

  if (payload.status !== undefined) {
    updateData.status =
      normalizeStatus(payload.status);
  }

  if (payload.description !== undefined) {
    updateData.description =
      payload.description || null;
  }

  if (payload.baseUrl !== undefined) {
    updateData.baseUrl =
      payload.baseUrl
        ? String(payload.baseUrl).trim()
        : null;
  }

  if (payload.webhookUrl !== undefined) {
    updateData.webhookUrl =
      payload.webhookUrl || null;
  }

  if (payload.priority !== undefined) {
    updateData.priority = Number(
      payload.priority || 1
    );
  }

  if (payload.isFallback !== undefined) {
    updateData.isFallback = Boolean(
      payload.isFallback
    );
  }

  if (payload.timeoutMs !== undefined) {
    updateData.timeoutMs = Number(
      payload.timeoutMs || 30000
    );
  }

  await prisma.apiProvider.update({
    where: {
      id,
    },
    data: updateData,
  });

  await saveCredentials(id, {
    apiKey: payload.apiKey,
    secretKey: payload.secretKey,
    username: payload.username,
    password: payload.password,
  });

  return getPartnerById(id);
};

const updatePartnerStatus = async (
  id,
  status
) => {
  const existing =
    await prisma.apiProvider.findUnique({
      where: {
        id,
      },
    });

  if (!existing) {
    throw new Error("Partner not found");
  }

  await prisma.apiProvider.update({
    where: {
      id,
    },
    data: {
      status: normalizeStatus(status),
    },
  });

  return getPartnerById(id);
};

const deletePartner = async (id) => {
  const existing =
    await prisma.apiProvider.findUnique({
      where: {
        id,
      },
      include: {
        services: true,
      },
    });

  if (!existing) {
    throw new Error("Partner not found");
  }

  if (existing.services.length > 0) {
    throw new Error(
      "Remove or remap partner services before deleting this partner"
    );
  }

  await prisma.apiProvider.delete({
    where: {
      id,
    },
  });

  return true;
};

const getDecryptedCredentials = async (
  providerId
) => {
  const credentials =
    await prisma.apiProviderCredential.findMany({
      where: {
        providerId,
        active: true,
      },
    });

  return credentials.reduce(
    (result, credential) => {
      result[credential.name] =
        decryptCredential({
          encryptedValue:
            credential.encryptedValue,
          initializationVector:
            credential.initializationVector,
          authenticationTag:
            credential.authenticationTag,
        });

      return result;
    },
    {}
  );
};

const getActiveProviderForCategory =
  async (category) => {
    const normalizedCategory =
      normalizeCategory(category);

    const providers =
      await prisma.apiProvider.findMany({
        where: {
          category: normalizedCategory,
          status: "ACTIVE",
        },
        orderBy: [
          {
            isFallback: "asc",
          },
          {
            priority: "asc",
          },
        ],
      });

    if (providers.length === 0) {
      throw new Error(
        `No active ${normalizedCategory} provider configured`
      );
    }

    const provider = providers[0];

    const credentials =
      await getDecryptedCredentials(
        provider.id
      );

    return {
      ...provider,
      credentials,
    };
  };

module.exports = {
  listPartners,
  getPartnerById,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner,
  getDecryptedCredentials,
  getActiveProviderForCategory,
};