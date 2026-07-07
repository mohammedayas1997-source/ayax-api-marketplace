const prisma = require("../config/prisma");

exports.buildUssd = async ({
    network,
    service,
    phone,
    amount,
}) => {

    const template =
    await prisma.ussdTemplate.findFirst({

        where:{
            network,
            service,
            enabled:true,
        }

    });

    if(!template){

        throw new Error(
            "USSD template not configured."
        );

    }

    return template.template
        .replace("{phone}", phone)
        .replace("{amount}", amount);

};