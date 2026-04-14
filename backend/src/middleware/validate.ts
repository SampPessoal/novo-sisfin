import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: Array<{ campo: string; mensagem: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        result.error.errors.forEach((e) =>
          errors.push({ campo: `body.${e.path.join('.')}`, mensagem: e.message }),
        );
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        result.error.errors.forEach((e) =>
          errors.push({ campo: `params.${e.path.join('.')}`, mensagem: e.message }),
        );
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        result.error.errors.forEach((e) =>
          errors.push({ campo: `query.${e.path.join('.')}`, mensagem: e.message }),
        );
      } else {
        req.query = result.data;
      }
    }

    if (errors.length > 0) {
      return _res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: errors,
      });
    }

    next();
  };
}
