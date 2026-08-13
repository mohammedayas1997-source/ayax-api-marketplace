const { ZodError } = require("zod");

module.exports = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      let data;

      switch (source) {
        case "params":
          data = req.params;
          break;

        case "query":
          data = req.query;
          break;

        case "headers":
          data = req.headers;
          break;

        default:
          data = req.body;
      }

      const validated = await schema.parseAsync(data);

      switch (source) {
        case "params":
          req.params = validated;
          break;

        case "query":
          req.query = validated;
          break;

        case "headers":
          req.headers = {
            ...req.headers,
            ...validated,
          };
          break;

        default:
          req.body = validated;
      }

      next();

    } catch (error) {

      if (error instanceof ZodError) {

        return res.status(422).json({

          success: false,

          message: "Validation failed",

          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),

        });

      }

      return res.status(500).json({

        success: false,

        message: error.message,

      });

    }
  };
};