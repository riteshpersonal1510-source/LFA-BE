import { Request, Response, NextFunction } from 'express';

function setCorsHeaders(res: Response): void {
  const origin = '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, ngrok-skip-browser-warning, X-Requested-With, X-CSRF-Token, Cache-Control, Pragma');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export const notFoundMiddleware = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  setCorsHeaders(res);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
