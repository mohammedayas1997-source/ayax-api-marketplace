const documentationService = require("./documentation.service");
const createAuditLog = require("../../utils/audit");

exports.getDocs = async (req, res) => {
  try {
    const docs = await documentationService.getDocs(req.query);

    return res.json({
      success: true,
      docs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDoc = async (req, res) => {
  try {
    const doc = await documentationService.getDoc(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Documentation not found",
      });
    }

    return res.json({
      success: true,
      doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createDoc = async (req, res) => {
  try {
    const doc = await documentationService.createDoc(req.body);

    await createAuditLog({
      user: req.user,
      action: "CREATE_API_DOCUMENTATION",
      module: "API_DOCUMENTATION",
      description: `${req.user.email} created API documentation ${doc.title}`,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Documentation created successfully",
      doc,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDoc = async (req, res) => {
  try {
    const doc = await documentationService.updateDoc(req.params.id, req.body);

    await createAuditLog({
      user: req.user,
      action: "UPDATE_API_DOCUMENTATION",
      module: "API_DOCUMENTATION",
      description: `${req.user.email} updated API documentation ${doc.title}`,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: "Documentation updated successfully",
      doc,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteDoc = async (req, res) => {
  try {
    const doc = await documentationService.deleteDoc(req.params.id);

    await createAuditLog({
      user: req.user,
      action: "DELETE_API_DOCUMENTATION",
      module: "API_DOCUMENTATION",
      description: `${req.user.email} deleted API documentation ${doc.title}`,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: "Documentation deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};