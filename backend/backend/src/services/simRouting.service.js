const prisma = require("../config/prisma");

exports.getPreferredSim = async ({
    network,
    service,
}) => {

    const rule =
    await prisma.simRoutingRule.findFirst({

        where:{
            network,
            service,
            enabled:true
        }

    });

    if(!rule){

        return 0;
    }

    return rule.preferredSim;

}