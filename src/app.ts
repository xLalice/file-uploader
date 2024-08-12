import express from "express";
import passport, { authenticate } from "passport";
import session from "express-session";
import multer from "multer";
const path = require("path");
import { PrismaClient } from "@prisma/client";
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import "./config/passport";
import authRoutes from "./routes/authRoutes";
import fileRoutes from "./routes/fileRoutes";
import folderRoutes from "./routes/folderRoutes";
import flash from "connect-flash";

const methodOverride = require("method-override")

require("dotenv").config();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
const app = express();
const prisma = new PrismaClient();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(methodOverride("_method"))
app.use(flash());

app.use(
    session({
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
        secret: process.env.SESSION_SECRET || "",
        resave: true,
        saveUninitialized: true,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000,
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined
        })

    })
);


app.use(passport.session());
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  next();
});

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/folders", folderRoutes);

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect('/folders');
    } else {
      res.render('login', { user: req.user });
    }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!', user: req.user});
  });

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large' , user: req.user});
      }
    }
    next(err);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
})