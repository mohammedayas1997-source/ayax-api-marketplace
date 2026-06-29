const walletService = require("./wallet.service");
const createAuditLog = require("../../utils/audit");
const { emitEvent } = require("../../config/socket");

// ===============================
// Get My Wallet
// GET /api/v1/wallet/me
// ===============================
exports.getMyWallet = async (req, res) => {
  try {
    const result = await walletService.getMyWallet(req.user.id);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get User Wallet
// GET /api/v1/wallet/user/:userId
// ===============================
exports.getWalletByUserId = async (req, res) => {
  try {
    const wallet = await walletService.getWalletByUserId(req.params.userId);

    return res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Create Funding Request
// POST /api/v1/wallet/funding
// ===============================
exports.createFundingRequest = async (req, res) => {
  try {
    const funding = await walletService.createFundingRequest(
      req.user.id,
      req.body
    );

    await createAuditLog({
      user: req.user,
      action: "CREATE_FUNDING_REQUEST",
      module: "WALLET",
      description: `${req.user.email} created funding request ${funding.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-funding-created", {
      message: "New wallet funding request",
      funding,
    });

    return res.status(201).json({
      success: true,
      message: "Funding request submitted successfully",
      funding,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Funding Requests
// GET /api/v1/wallet/funding
// ===============================
exports.getFundingRequests = async (req, res) => {
  try {
    const fundings = await walletService.getFundingRequests(req.query);

    return res.json({
      success: true,
      fundings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Approve Funding
// PATCH /api/v1/wallet/funding/:id/approve
// ===============================
exports.approveFunding = async (req, res) => {
  try {
    const result = await walletService.approveFunding({
      fundingId: req.params.id,
      adminUser: req.user,
      pin: req.body.pin,
      note: req.body.note,
    });

    await createAuditLog({
      user: req.user,
      action: "APPROVE_FUNDING",
      module: "WALLET",
      description: `${req.user.email} approved funding ${result.funding.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-funding-approved", {
      message: "Wallet funding approved",
      result,
    });

    return res.json({
      success: true,
      message: "Funding approved successfully",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Reject Funding
// PATCH /api/v1/wallet/funding/:id/reject
// ===============================
exports.rejectFunding = async (req, res) => {
  try {
    const funding = await walletService.rejectFunding({
      fundingId: req.params.id,
      adminUser: req.user,
      note: req.body.note,
    });

    await createAuditLog({
      user: req.user,
      action: "REJECT_FUNDING",
      module: "WALLET",
      description: `${req.user.email} rejected funding ${funding.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-funding-rejected", {
      message: "Wallet funding rejected",
      funding,
    });

    return res.json({
      success: true,
      message: "Funding rejected successfully",
      funding,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Create Withdrawal Request
// POST /api/v1/wallet/withdrawal
// ===============================
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const withdrawal = await walletService.createWithdrawalRequest(
      req.user.id,
      req.body
    );

    await createAuditLog({
      user: req.user,
      action: "CREATE_WITHDRAWAL_REQUEST",
      module: "WALLET",
      description: `${req.user.email} created withdrawal request ${withdrawal.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-withdrawal-created", {
      message: "New withdrawal request",
      withdrawal,
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Withdrawal Requests
// GET /api/v1/wallet/withdrawal
// ===============================
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const withdrawals = await walletService.getWithdrawalRequests(req.query);

    return res.json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Approve Withdrawal
// PATCH /api/v1/wallet/withdrawal/:id/approve
// ===============================
exports.approveWithdrawal = async (req, res) => {
  try {
    const result = await walletService.approveWithdrawal({
      withdrawalId: req.params.id,
      adminUser: req.user,
      pin: req.body.pin,
      note: req.body.note,
    });

    await createAuditLog({
      user: req.user,
      action: "APPROVE_WITHDRAWAL",
      module: "WALLET",
      description: `${req.user.email} approved withdrawal ${result.withdrawal.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-withdrawal-approved", {
      message: "Wallet withdrawal approved",
      result,
    });

    return res.json({
      success: true,
      message: "Withdrawal approved successfully",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Reject Withdrawal
// PATCH /api/v1/wallet/withdrawal/:id/reject
// ===============================
exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await walletService.rejectWithdrawal({
      withdrawalId: req.params.id,
      adminUser: req.user,
      note: req.body.note,
    });

    await createAuditLog({
      user: req.user,
      action: "REJECT_WITHDRAWAL",
      module: "WALLET",
      description: `${req.user.email} rejected withdrawal ${withdrawal.reference}`,
      ip: req.ip,
    });

    emitEvent("wallet-withdrawal-rejected", {
      message: "Wallet withdrawal rejected",
      withdrawal,
    });

    return res.json({
      success: true,
      message: "Withdrawal rejected successfully",
      withdrawal,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Manual Adjustment
// POST /api/v1/wallet/adjust
// ===============================
exports.manualAdjustment = async (req, res) => {
  try {
    const result = await walletService.manualAdjustment(req.body);

    await createAuditLog({
      user: req.user,
      action: "MANUAL_WALLET_ADJUSTMENT",
      module: "WALLET",
      description: `${req.user.email} made ${req.body.type} adjustment for user ${req.body.userId}`,
      ip: req.ip,
    });

    emitEvent("wallet-adjusted", {
      message: "Wallet manually adjusted",
      result,
    });

    return res.json({
      success: true,
      message: "Wallet adjusted successfully",
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Wallet Ledger
// GET /api/v1/wallet/ledger
// ===============================
exports.getLedger = async (req, res) => {
  try {
    const ledger = await walletService.getLedger(req.query);

    return res.json({
      success: true,
      ledger,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Wallet Statistics
// GET /api/v1/wallet/statistics
// ===============================
exports.statistics = async (req, res) => {
  try {
    const stats = await walletService.statistics();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};