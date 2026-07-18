import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: any; // Decoded id token
  dbUser?: any; // The corresponding users record in PostgreSQL
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Support simulation headers for seamless in-app testing across roles
  const simulatedUid = req.headers['x-simulated-uid'] as string;
  const simulatedRole = req.headers['x-simulated-role'] as string;
  const simulatedEmail = req.headers['x-simulated-email'] as string;
  const simulatedName = req.headers['x-simulated-name'] as string;

  if (simulatedUid) {
    try {
      let [existing] = await db.select().from(users).where(eq(users.uid, simulatedUid));
      if (!existing) {
        const email = simulatedEmail || `${simulatedUid}@simulated.org`;
        const name = simulatedName || simulatedUid.replace('uid_', '').toUpperCase();
        const inserted = await db.insert(users)
          .values({
            uid: simulatedUid,
            email,
            name,
            role: simulatedRole || 'Citizen',
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: { email },
          })
          .returning();
        existing = inserted[0];
      } else if (simulatedRole && existing.role !== simulatedRole) {
        // Automatically sync the simulated role if it changed
        const updated = await db.update(users)
          .set({ role: simulatedRole })
          .where(eq(users.uid, simulatedUid))
          .returning();
        existing = updated[0];
      }

      if (existing && existing.isSuspended) {
        if (req.baseUrl + req.path === '/api/auth/me') {
          req.user = { uid: simulatedUid, email: existing.email, name: existing.name };
          req.dbUser = existing;
          return next();
        }
        return res.status(403).json({ error: 'Account Suspended: Your account has been suspended due to fake or inappropriate reports.' });
      }

      req.user = { uid: simulatedUid, email: existing.email, name: existing.name };
      req.dbUser = existing;
      return next();
    } catch (dbErr) {
      console.error('Failed simulation sync with SQL database:', dbErr);
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Fetch or create user record in Postgres
    const uid = decodedToken.uid;
    const email = decodedToken.email || `${uid}@temporary.rescue`;
    const name = decodedToken.name || email.split('@')[0];

    try {
      let [existing] = await db.select().from(users).where(eq(users.uid, uid));
      if (!existing) {
        const inserted = await db.insert(users)
          .values({
            uid,
            email,
            name,
            role: 'Citizen',
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: { email },
          })
          .returning();
        existing = inserted[0];
      }

      if (existing && existing.isSuspended) {
        if (req.baseUrl + req.path === '/api/auth/me') {
          req.dbUser = existing;
          return next();
        }
        return res.status(403).json({ error: 'Account Suspended: Your account has been suspended due to fake or inappropriate reports.' });
      }

      req.dbUser = existing;
    } catch (dbErr) {
      console.error('Failed to sync user with SQL database:', dbErr);
      req.dbUser = { uid, email, name, role: 'Citizen' };
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
