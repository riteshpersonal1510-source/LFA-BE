"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        req.body = parsed.body;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: error.errors,
            });
            return;
        }
        next(error);
    }
};
exports.validate = validate;
//# sourceMappingURL=validations.js.map