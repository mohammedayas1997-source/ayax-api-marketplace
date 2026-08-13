const prisma = require("../config/prisma");

exports.buildUssd = async ({
    network,
    service,
    phone,
    amount,
    pin,
}) => {
    // Binciken USSD Template daga Database bisa ga Network da Service
    const templateRecord = await prisma.ussdTemplate.findFirst({
        where: {
            network: String(network).toUpperCase(),
            service: String(service).toUpperCase(),
            enabled: true,
        },
    });

    if (!templateRecord || !templateRecord.template) {
        throw new Error(
            `USSD template not configured for network: ${network} and service: ${service}`
        );
    }

    let ussdString = templateRecord.template;

    // Maye gurbin wuraren da aka sanya alamomi (Placeholders)
    if (phone) {
        ussdString = ussdString.replace(/\{phone\}/g, phone);
    }

    if (amount !== undefined && amount !== null) {
        ussdString = ussdString.replace(/\{amount\}/g, String(amount));
    }

    if (pin) {
        ussdString = ussdString.replace(/\{pin\}/g, pin);
    }

    // Tace sakon karshe domin cire duk wani agurbin da bai dace ba
    return ussdString.trim();
};