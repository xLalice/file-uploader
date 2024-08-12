import { PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";
import fs from "fs";
import isAuthenticated from "../middlewares/auth";
import { format } from "date-fns";
import { cloudinary } from "../config/cloudinary";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/:id", isAuthenticated, async (req:any, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).render("error", { message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        const file = await prisma.file.findUnique({
            where: { id, userId }
        });

        if (!file) {
            return res.status(404).render("error", { message: "File not found" });
        }

        res.render("fileDetails", {
            user: req.user,
            file: {
                ...file,
                sizeInKB: (file.size / 1024).toFixed(2),
                uploadTime: format(file.createdAt, "PPpp")
            }
        });
    } catch (error) {
        res.status(500).render("error", { message: "Error fetching file details" });
    }
});


router.get("/:id/download", isAuthenticated, async (req:any, res) => {
    const id = parseInt(req.params.id);

    if (!req.user || !req.user.id) {
        return res.status(400).render("error", { message: "User not authenticated" });
    }

    const userId = req.user.id;

    try {
        const file = await prisma.file.findUnique({
            where: { id, userId }
        });

        if (!file) {
            return res.status(404).render("error", { message: "File not found"});
        }

        const resourceType = file.name.endsWith('.jpg') || file.name.endsWith('.png') ? 'image' : 'raw';

        const downloadUrl = cloudinary.url(file.public_id, {
            resource_type: resourceType,
            flags: "attachment",
            secure: true
        });

        res.redirect(downloadUrl);
    } catch (error) {
        res.status(500).render("error", { message: "Error downloading file", user: req.user });
    }
});

router.delete("/:id", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);

    if (!req.user || !req.user.id) {
        return res.status(400).render("error", { message: "User not authenticated" });
    }

    const userId = req.user.id;

    try {
        const file = await prisma.file.findUnique({
            where: { id, userId }
        });

        if (!file) {
            return res.status(404).render("Error", { message: "File not found" });
        }

        await cloudinary.uploader.destroy(file.public_id)

        await prisma.file.delete({
            where: { id }
        });

        res.redirect(`/folders/${file.folderId}`);
    } catch (error) {
        res.status(500).render("error", { message: "Error deleting file" });
    }
});

export default router;