import express, { Request, Response } from "express";
import passport from "passport";
import { PrismaClient } from "@prisma/client";
const bcrypt = require("bcrypt")

const router = express.Router();
const prisma = new PrismaClient();

interface SignupRequest extends Request {
  body: {
    email: string;
    name: string;
    password: string;
    username: string;
  };
}

// Render the signup page
router.get("/register", (req, res) => {
  res.render("register", { user: req.user});
});

// Handle signup
router.post("/register", async (req: SignupRequest, res: Response) => {
  try {
    const { email, password, username } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      req.flash('error', 'Email already in use');
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username
        
      },
    });
    req.flash('success', 'Registration successful. You can now log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
});

// Render the login page
router.get("/login", (req, res) => {
  res.render("login", { user: req.user});
});

// Handle login with passport
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user:any, info:any) => {
    if (err) {
      console.error("Authentication error:", err);
      return next(err);
    }
    if (!user) {
      console.log("Authentication failed:", info.message);
      req.flash("error", info.message);
      return res.redirect("/auth/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      return res.redirect('/');
    });
  })(req, res, next);
});

// Handle logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

export default router;
