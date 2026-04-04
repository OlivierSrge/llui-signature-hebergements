import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'CHANGE_ME_IN_PRODUCTION';

/**
 * Middleware d'authentification JWT.
 * Injecte req.user : JwtPayload si le token est valide.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expiré' });
    } else {
      res.status(401).json({ error: 'Token invalide' });
    }
  }
}

/**
 * Middleware RBAC : restreint l'accès aux rôles spécifiés.
 * Applique automatiquement authenticate() en premier.
 */
export function requireRole(roles: UserRole[] | string[]) {
  return [
    authenticate,
    (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user as JwtPayload | undefined;

      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({
          error: `Accès refusé. Rôles autorisés : ${roles.join(', ')}`,
        });
        return;
      }

      next();
    },
  ];
}

/**
 * Génère un access token JWT (15 min)
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Génère un refresh token JWT (30 jours)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
}
