const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

async function updateCommand(reference, status, response = null) {
  const isCompleted =
    status === "SUCCESSFUL" ||
    status === "FAILED" ||
    status === "CANCELLED";

  const command = await prisma.gsmCommand.findUnique({
    where: { reference },
  });

  if (!command) {
    throw new Error(`Command not found: ${reference}`);
  }

  const updated = await prisma.gsmCommand.update({
    where: { reference },
    data: {
      status,
      response,
      completedAt: isCompleted ? new Date() : command.completedAt,
    },
  });

  emitEvent("gsm-command-updated", {
    command: updated,
    reference: updated.reference,
    deviceId: updated.deviceId,
    type: updated.type,
    status: updated.status,
    response: updated.response,
    payload: updated.payload,
    completedAt: updated.completedAt,
  });

  return updated;
}

async function markCommandProcessing({ reference, message }) {
  return updateCommand(
    reference,
    "PROCESSING",
    message || "Processing"
  );
}

async function markCommandSuccessful({ reference, message }) {
  return updateCommand(
    reference,
    "SUCCESSFUL",
    message || "Successful"
  );
}

async function markCommandFailed({ reference, message }) {
  return updateCommand(
    reference,
    "FAILED",
    message || "Failed"
  );
}

module.exports = {
  updateCommand,
  markCommandProcessing,
  markCommandSuccessful,
  markCommandFailed,
};