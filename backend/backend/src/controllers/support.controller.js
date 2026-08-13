const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

exports.createTicket = async (req, res) => {
  try {
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        message,
        priority: priority || "NORMAL",
      },
    });

    emitEvent("support-ticket-created", {
      message: "New support ticket",
      ticket,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    emitEvent("support-ticket-updated", {
      message: "Ticket status updated",
      ticket,
    });

    return res.json({
      success: true,
      message: "Ticket status updated",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.escalateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        escalated: true,
        assignedTo: assignedTo || "ADMIN",
        status: "IN_PROGRESS",
      },
    });

    emitEvent("support-ticket-escalated", {
      message: "Ticket escalated",
      ticket,
    });

    return res.json({
      success: true,
      message: "Ticket escalated successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTickets = exports.getAllTickets;
exports.updateTicket = exports.updateTicketStatus;