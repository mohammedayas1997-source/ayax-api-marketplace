const walletService = require("./wallet.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");
const prisma = require("../../config/prisma");

/* ======================================================
   HELPERS
====================================================== */

const getErrorStatus = (
  error,
  defaultStatus = 500
) => {
  if (
    Number.isInteger(error?.statusCode)
  ) {
    return error.statusCode;
  }

  if (
    Number.isInteger(error?.status)
  ) {
    return error.status;
  }

  const message = String(
    error?.message || ""
  ).toLowerCase();

  if (
    message.includes("not found")
  ) {
    return 404;
  }

  if (
    message.includes("unauthorized") ||
    message.includes("invalid pin")
  ) {
    return 401;
  }

  if (
    message.includes("forbidden") ||
    message.includes("access denied")
  ) {
    return 403;
  }

  if (
    message.includes("already") ||
    message.includes("duplicate")
  ) {
    return 409;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("insufficient") ||
    message.includes("cannot") ||
    message.includes("must")
  ) {
    return 400;
  }

  return defaultStatus;
};

const sendError = (
  res,
  error,
  fallbackMessage,
  defaultStatus = 500
) => {
  console.error(
    fallbackMessage,
    error
  );

  return res
    .status(
      getErrorStatus(
        error,
        defaultStatus
      )
    )
    .json({
      success: false,
      message:
        error?.message ||
        fallbackMessage,
    });
};

const writeAuditLog = async ({
  req,
  action,
  description,
}) => {
  try {
    await createAuditLog({
      user: req.user,
      action,
      module: "WALLET",
      description,
      ip:
        req.ip ||
        req.headers[
          "x-forwarded-for"
        ] ||
        null,
    });
  } catch (error) {
    console.error(
      "Wallet audit log error:",
      error.message
    );
  }
};

const publishEvent = (
  eventName,
  payload
) => {
  try {
    if (
      typeof emitEvent ===
      "function"
    ) {
      emitEvent(
        eventName,
        payload
      );
    }
  } catch (error) {
    console.error(
      `Socket event error (${eventName}):`,
      error.message
    );
  }
};

const ensureId = (
  value,
  fieldName
) => {
  const id = String(
    value || ""
  ).trim();

  if (!id) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;

    throw error;
  }

  return id;
};

const getUserEmail = (req) =>
  req.user?.email ||
  "Unknown user";

/* ======================================================
   GET MY WALLET (General User & Admin)
   GET /api/v1/wallet or GET /api/v1/admin/wallet/me
====================================================== */

exports.getMyWallet = async (
  req,
  res
) => {
  try {
    const userId = ensureId(
      req.user?.id,
      "User ID"
    );

    const result =
      await walletService.getMyWallet(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Wallet retrieved successfully.",
      ...result,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve wallet."
    );
  }
};

/* ======================================================
   GET USER WALLET
   GET /api/v1/admin/wallet/user/:userId
====================================================== */

exports.getWalletByUserId =
  async (req, res) => {
    try {
      const userId = ensureId(
        req.params.userId,
        "User ID"
      );

      const wallet =
        await walletService.getWalletByUserId(
          userId
        );

      return res.status(200).json({
        success: true,
        message:
          "User wallet retrieved successfully.",
        wallet,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to retrieve user wallet."
      );
    }
  };

/* ======================================================
   CREATE FUNDING REQUEST
   POST /api/v1/wallet/funding or POST /api/v1/admin/wallet/funding
====================================================== */

exports.createFundingRequest =
  async (req, res) => {
    try {
      const userId = ensureId(
        req.user?.id,
        "User ID"
      );

      const funding =
        await walletService.createFundingRequest(
          userId,
          req.body
        );

      await writeAuditLog({
        req,
        action:
          "CREATE_FUNDING_REQUEST",
        description:
          `${getUserEmail(
            req
          )} created funding request ${
            funding.reference
          }`,
      });

      publishEvent(
        "wallet-funding-created",
        {
          userId,
          message:
            "New wallet funding request",
          funding,
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Funding request submitted successfully.",
        funding,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to create funding request.",
        400
      );
    }
  };

/* ======================================================
   GET FUNDING REQUESTS
   GET /api/v1/admin/wallet/funding
====================================================== */

exports.getFundingRequests =
  async (req, res) => {
    try {
      const result =
        await walletService.getFundingRequests(
          req.query
        );

      if (Array.isArray(result)) {
        return res.status(200).json({
          success: true,
          message:
            "Funding requests retrieved successfully.",
          fundings: result,
          fundingRequests: result,
          count: result.length,
        });
      }

      const fundings =
        result?.fundings ||
        result?.fundingRequests ||
        result?.data ||
        [];

      return res.status(200).json({
        success: true,
        message:
          "Funding requests retrieved successfully.",
        ...result,
        fundings,
        fundingRequests:
          fundings,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to retrieve funding requests."
      );
    }
  };

/* ======================================================
   APPROVE FUNDING
   PATCH /api/v1/admin/wallet/funding/:id/approve
====================================================== */

exports.approveFunding = async (
  req,
  res
) => {
  try {
    const fundingId = ensureId(
      req.params.id,
      "Funding ID"
    );

    const result =
      await walletService.approveFunding(
        {
          fundingId,
          adminUser: req.user,
          pin: req.body.pin,
          note:
            req.body.note || null,
        }
      );

    await writeAuditLog({
      req,
      action:
        "APPROVE_FUNDING",
      description:
        `${getUserEmail(
          req
        )} approved funding ${
          result.funding.reference
        }`,
    });

    publishEvent(
      "wallet-funding-approved",
      {
        userId:
          result.funding.userId,
        message:
          "Wallet funding approved",
        result,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Funding approved successfully.",
      ...result,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to approve funding.",
      400
    );
  }
};

/* ======================================================
   REJECT FUNDING
   PATCH /api/v1/admin/wallet/funding/:id/reject
====================================================== */

exports.rejectFunding = async (
  req,
  res
) => {
  try {
    const fundingId = ensureId(
      req.params.id,
      "Funding ID"
    );

    const funding =
      await walletService.rejectFunding(
        {
          fundingId,
          adminUser: req.user,
          note:
            req.body.note || null,
        }
      );

    await writeAuditLog({
      req,
      action:
        "REJECT_FUNDING",
      description:
        `${getUserEmail(
          req
        )} rejected funding ${
          funding.reference
        }`,
    });

    publishEvent(
      "wallet-funding-rejected",
      {
        userId:
          funding.userId,
        message:
          "Wallet funding rejected",
        funding,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Funding rejected successfully.",
      funding,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to reject funding.",
      400
    );
  }
};

/* ======================================================
   CREATE WITHDRAWAL REQUEST
   POST /api/v1/wallet/withdrawal or POST /api/v1/admin/wallet/withdrawal
====================================================== */

exports.createWithdrawalRequest =
  async (req, res) => {
    try {
      const userId = ensureId(
        req.user?.id,
        "User ID"
      );

      const withdrawal =
        await walletService.createWithdrawalRequest(
          userId,
          req.body
        );

      await writeAuditLog({
        req,
        action:
          "CREATE_WITHDRAWAL_REQUEST",
        description:
          `${getUserEmail(
            req
          )} created withdrawal request ${
            withdrawal.reference
          }`,
      });

      publishEvent(
        "wallet-withdrawal-created",
        {
          userId,
          message:
            "New withdrawal request",
          withdrawal,
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Withdrawal request submitted successfully.",
        withdrawal,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to create withdrawal request.",
        400
      );
    }
  };

/* ======================================================
   GET WITHDRAWAL REQUESTS
   GET /api/v1/admin/wallet/withdrawal
====================================================== */

exports.getWithdrawalRequests =
  async (req, res) => {
    try {
      const result =
        await walletService.getWithdrawalRequests(
          req.query
        );

      if (Array.isArray(result)) {
        return res.status(200).json({
          success: true,
          message:
            "Withdrawal requests retrieved successfully.",
          withdrawals: result,
          count: result.length,
        });
      }

      const withdrawals =
        result?.withdrawals ||
        result?.data ||
        [];

      return res.status(200).json({
        success: true,
        message:
          "Withdrawal requests retrieved successfully.",
        ...result,
        withdrawals,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to retrieve withdrawal requests."
      );
    }
  };

/* ======================================================
   APPROVE WITHDRAWAL
   PATCH /api/v1/admin/wallet/withdrawal/:id/approve
====================================================== */

exports.approveWithdrawal =
  async (req, res) => {
    try {
      const withdrawalId =
        ensureId(
          req.params.id,
          "Withdrawal ID"
        );

      const result =
        await walletService.approveWithdrawal(
          {
            withdrawalId,
            adminUser: req.user,
            pin: req.body.pin,
            note:
              req.body.note ||
              null,
          }
        );

      await writeAuditLog({
        req,
        action:
          "APPROVE_WITHDRAWAL",
        description:
          `${getUserEmail(
            req
          )} approved withdrawal ${
            result.withdrawal
              .reference
          }`,
      });

      publishEvent(
        "wallet-withdrawal-approved",
        {
          userId:
            result.withdrawal
              .userId,
          message:
            "Wallet withdrawal approved",
          result,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Withdrawal approved successfully.",
        ...result,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to approve withdrawal.",
        400
      );
    }
  };

/* ======================================================
   REJECT WITHDRAWAL
   PATCH /api/v1/admin/wallet/withdrawal/:id/reject
====================================================== */

exports.rejectWithdrawal =
  async (req, res) => {
    try {
      const withdrawalId =
        ensureId(
          req.params.id,
          "Withdrawal ID"
        );

      const withdrawal =
        await walletService.rejectWithdrawal(
          {
            withdrawalId,
            adminUser: req.user,
            note:
              req.body.note ||
              null,
          }
        );

      await writeAuditLog({
        req,
        action:
          "REJECT_WITHDRAWAL",
        description:
          `${getUserEmail(
            req
          )} rejected withdrawal ${
            withdrawal.reference
          }`,
      });

      publishEvent(
        "wallet-withdrawal-rejected",
        {
          userId:
            withdrawal.userId,
          message:
            "Wallet withdrawal rejected",
          withdrawal,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Withdrawal rejected successfully.",
        withdrawal,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to reject withdrawal.",
        400
      );
    }
  };

/* ======================================================
   MANUAL WALLET ADJUSTMENT
   POST /api/v1/admin/wallet/adjust
====================================================== */

exports.manualAdjustment =
  async (req, res) => {
    try {
      const userId = ensureId(
        req.body.userId,
        "User ID"
      );

      const adjustmentType =
        String(
          req.body.type || ""
        )
          .trim()
          .toUpperCase();

      if (
        ![
          "CREDIT",
          "DEBIT",
          "ADJUSTMENT",
        ].includes(
          adjustmentType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Adjustment type must be CREDIT, DEBIT or ADJUSTMENT.",
        });
      }

      const result =
        await walletService.manualAdjustment(
          {
            ...req.body,
            userId,
            type:
              adjustmentType,
            adminUser:
              req.user,
          }
        );

      await writeAuditLog({
        req,
        action:
          "MANUAL_WALLET_ADJUSTMENT",
        description:
          `${getUserEmail(
            req
          )} made ${adjustmentType} adjustment for user ${userId}`,
      });

      publishEvent(
        "wallet-adjusted",
        {
          userId,
          message:
            "Wallet manually adjusted",
          result,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Wallet adjusted successfully.",
        ...result,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to adjust wallet.",
        400
      );
    }
  };

/* ======================================================
   WALLET LEDGER
   GET /api/v1/admin/wallet/ledger
====================================================== */

exports.getLedger = async (
  req,
  res
) => {
  try {
    const result =
      await walletService.getLedger(
        req.query
      );

    if (Array.isArray(result)) {
      return res.status(200).json({
        success: true,
        message:
          "Wallet ledger retrieved successfully.",
        ledger: result,
        transactions: result,
        count: result.length,
      });
    }

    const ledger =
      result?.ledger ||
      result?.transactions ||
      result?.data ||
      [];

    return res.status(200).json({
      success: true,
      message:
        "Wallet ledger retrieved successfully.",
      ...result,
      ledger,
      transactions: ledger,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve wallet ledger."
    );
  }
};

/* ======================================================
   WALLET STATISTICS
   GET /api/v1/admin/wallet/statistics
====================================================== */

exports.statistics = async (
  req,
  res
) => {
  try {
    const stats =
      await walletService.statistics();

    return res.status(200).json({
      success: true,
      message:
        "Wallet statistics retrieved successfully.",
      stats,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve wallet statistics."
    );
  }
};

/* ======================================================
   GET MY WALLET TRANSACTIONS (LEDGER)
   GET /api/v1/wallet/transactions or GET /api/v1/admin/wallet/transactions
====================================================== */

exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = ensureId(req.user?.id, "User ID");

    const query = {
      ...req.query,
      userId: req.user?.role === "ADMIN" ? req.query.userId : userId,
    };

    const result = await walletService.getLedger(query);

    if (Array.isArray(result)) {
      return res.status(200).json({
        success: true,
        message: "Wallet transactions retrieved successfully.",
        transactions: result,
        count: result.length,
      });
    }

    const transactions =
      result?.transactions ||
      result?.ledger ||
      result?.data ||
      [];

    return res.status(200).json({
      success: true,
      message: "Wallet transactions retrieved successfully.",
      ...result,
      transactions,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to retrieve wallet transactions."
    );
  }
};

/* ======================================================
   INITIALIZE PAYSTACK PAYMENT
   POST /api/v1/wallet/paystack/initialize
====================================================== */

exports.initializePaystack = async (req, res) => {
  try {
    const userId = ensureId(req.user?.id, "User ID");
    const email = req.user?.email;
    const { amount } = req.body;

    const result = await walletService.initializePaystackFunding({
      userId,
      email,
      amount,
    });

    await writeAuditLog({
      req,
      action: "INITIALIZE_PAYSTACK_PAYMENT",
      description: `${getUserEmail(req)} initialized Paystack payment of ₦${amount}`,
    });

    return res.status(200).json({
      success: true,
      message: "Paystack initialized successfully",
      data: {
        authorization_url: result.authorizationUrl,
        access_code: result.accessCode,
        reference: result.reference,
        funding: result.funding,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Could not retrieve payment authorization URL.",
      400
    );
  }
};

exports.verifyPaystackFunding = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required.",
      });
    }

    // 1. Duba ko akwai fund request da wannan reference ɗin a database
    const funding = await prisma.walletFunding.findFirst({
      where: { reference },
    });

    if (!funding) {
      return res.status(404).json({
        success: false,
        message: "Wallet funding record not found.",
      });
    }

    if (funding.status === "APPROVED" || funding.status === "SUCCESSFUL") {
      return res.status(200).json({
        success: false,
        message: "Payment has already been verified.",
      });
    }

    // 2. Tabbatar da biyan kuɗi daga Paystack API
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status || result.data.status !== "success") {
      await prisma.walletFunding.update({
        where: { id: funding.id },
        data: { status: "FAILED", note: "Paystack verification failed." },
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed or was not successful.",
      });
    }

    // 3. Amfani da asalin adadin da mai amfani ya nema (funding.amount) maimakon kuɗin da Paystack ta cire da charges
    const amount = Number(funding.amount);

    const updatedWallet = await prisma.$transaction(async (tx) => {
      // Sabunta matsayin funding
      await tx.walletFunding.update({
        where: { id: funding.id },
        data: { status: "APPROVED", note: "Verified successfully via Paystack." },
      });

      // Ƙara kuɗin a cikin wallet na mai amfani (tare da asalin adadin)
      const wallet = await tx.wallet.update({
        where: { userId: funding.userId },
        data: { balance: { increment: amount } },
      });

      return wallet;
    });

    return res.status(200).json({
      success: true,
      message: "Wallet funded successfully!",
      data: {
        wallet: updatedWallet,
        amount,
        reference,
      },
    });
  } catch (error) {
    console.error("Verify Paystack error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify payment.",
    });
  }
};

/* ======================================================
   PAYSTACK WEBHOOK HANDLER
   POST /api/v1/wallet/paystack/webhook
====================================================== */

exports.paystackWebhook = async (req, res) => {
  try {
    const crypto = require("crypto");
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];

    if (!secret || !signature) {
      return res.status(400).json({ success: false, message: "Missing signature or secret" });
    }

    // 1. Tabbatar da ingancin signature daga Paystack
    const rawBody = req.rawBody ? req.rawBody : JSON.stringify(req.body);
    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.warn("Paystack Webhook: Invalid signature rejected.");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body;

    // 2. Sarrafa biyan kudi idan ya yi nasara (charge.success)
    if (event.event === "charge.success") {
      const { reference, amount } = event.data;
      const paidAmount = Number(amount) / 100;

      // Nemo ko akwai record din wannan biyan a walletFunding
      const funding = await prisma.walletFunding.findFirst({
        where: { reference },
      });

      if (funding && funding.status !== "APPROVED" && funding.status !== "SUCCESSFUL") {
        const creditAmount = Number(funding.amount || paidAmount);

        await prisma.$transaction(async (tx) => {
          await tx.walletFunding.update({
            where: { id: funding.id },
            data: { status: "APPROVED", note: "Auto-credited via Paystack Webhook." },
          });

          await tx.wallet.update({
            where: { userId: funding.userId },
            data: { balance: { increment: creditAmount } },
          });
        });

        publishEvent("wallet-funding-approved", {
          userId: funding.userId,
          message: `Wallet funded successfully with ₦${creditAmount}`,
          reference,
        });

        console.log(`✓ Webhook: Wallet auto-credited ₦${creditAmount} for user ${funding.userId}`);
      }
    }

    // Paystack na bukatar 200 OK nan take
    return res.status(200).json({ success: true, message: "Webhook acknowledged" });
  } catch (error) {
    console.error("Paystack Webhook Processing Error:", error);
    return res.status(200).json({ success: true, message: "Webhook received with error" });
  }
};

// Aliases don dacewa da safeHandler
exports.handlePaystackWebhook = exports.paystackWebhook;
exports.webhook = exports.paystackWebhook;