const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

async function updateCommand(reference, status, response = null) {
  let finalStatus = status;
  let finalResponse = response;

  // GWADA GWADE (Condition): Idan sakon farko ne na farawa, kada a bari ya zama SUCCESSFUL da wuri
  if (finalStatus === "SUCCESSFUL" && finalResponse) {
    const lowerMsg = String(finalResponse).toLowerCase();
    if (lowerMsg.includes("ussd command started") || lowerMsg.includes("initiated successfully") || lowerMsg.includes("processing")) {
      finalStatus = "PROCESSING";
    }
  }

  const isCompleted =
    finalStatus === "SUCCESSFUL" ||
    finalStatus === "FAILED" ||
    finalStatus === "CANCELLED";

  const command = await prisma.gsmCommand.findUnique({
    where: { reference },
  });

  if (!command) {
    throw new Error(`Command not found: ${reference}`);
  }

  const updated = await prisma.gsmCommand.update({
    where: { reference },
    data: {
      status: finalStatus,
      response: finalResponse,
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