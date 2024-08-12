import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends PrismaUser {
      id: number
    }
    interface Request {
      user?: User;
    }
  }
}
