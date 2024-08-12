import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { PrismaClient} from "@prisma/client";
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

interface User {
    id: number;
    email: string;
    username: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
  }

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (
      email: string,
      password: string,
      done: (error: any, user?: User | false, options?: { message: string }) => void
    ) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return done(null, false, { message: "There's no such email" });
        }

        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
          return done(null, false, { message: "Wrong password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done: (error: any, id?: number) => void) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done: (error: any, user?: User | null) => void) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
