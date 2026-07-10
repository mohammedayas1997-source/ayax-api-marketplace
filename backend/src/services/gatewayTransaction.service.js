const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

async function updateCommand(reference, status, response = null) {
  const command = await prisma.gsmCommand.update({
    where: { reference },
    data: {
      status,
      response,
      completedAt:
        status === "SUCCESSFUL" || status === "FAILED" ? new Date() : undefined,
    },
  });

  emitEvent("gsm-command-updated", { command });
  return command;
}

async function markCommandProcessing({ reference, message }) {
  return updateCommand(reference, "PROCESSING", message || "Processing");
}

async function markCommandSuccessful({ reference, message }) {
  return updateCommand(reference, "SUCCESSFUL", message || "Successful");
}

async function markCommandFailed({ reference, message }) {
  return updateCommand(reference, "FAILED", message || "Failed");
}

module.exports = {
  updateCommand,
  markCommandProcessing,
  markCommandSuccessful,
  markCommandFailed,
};