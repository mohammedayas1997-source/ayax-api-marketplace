const prisma = require("../config/prisma");
const crypto = require("crypto");

exports.generatePairCode = async (req, res) => {
  try {
    const code =
      "AYAX-" +
      crypto.randomBytes(3).toString("hex").toUpperCase();

    const pairCode = await prisma.gsmPairCode.create({
      data: {
        code,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      },
    });

    return res.status(201).json({
      success: true,
      code: pairCode.code,
      expiresAt: pairCode.expiresAt,
    });

  } catch (e) {

    return res.status(400).json({
      success:false,
      message:e.message
    });

  }

};

exports.getPairCodes = async (req,res)=>{

const codes =
await prisma.gsmPairCode.findMany({

orderBy:{
createdAt:"desc"
}

});

return res.json({

success:true,

codes

});

};