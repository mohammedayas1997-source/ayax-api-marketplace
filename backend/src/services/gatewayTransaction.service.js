const prisma = require("../config/prisma");
const { emitEvent } = require("../config/socket");

async function updateCommand(reference, status, response = null) {
  const isCompleted =
    status === "SUCCESSFUL" ||
    status === "FAILED" ||
    status === "CANCELLED";

  const command = await prisma.gsmCommand.update({
    where: {
      reference,
    },
    data: {
      status,
      response,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  emitEvent("gsm-command-updated", {
    command,
    reference: command.reference,
    deviceId: command.deviceId,
    type: command.type,
    status: command.status,
    response: command.response,
    payload: command.payload,
    completedAt: command.completedAt,
  });

  return command;
}

async function markCommandProcessing({ reference, message }) {
  return updateCommand(
    reference,
    "PROCESSING",
    message || "Processing"
  );
}

async function markCommandSuccessful({ reference, message }) {
  const command = await prisma.gsmCommand.update({
    where: { reference },
    data: {
      status: "SUCCESSFUL",
      response: message,
      completedAt: new Date(),
    },
  });

  emitEvent("gsm-command-updated", command);

  return command;
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