import express from "express";
import upload from "../config/upload";
import isAuthenticated from "../middlewares/auth";
import {cloudinary} from "../config/cloudinary";
import {v4 as uuidv4} from "uuid";
import { addDays } from "date-fns";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/:id/upload", isAuthenticated, upload.single("file"), async (req: any, res: any) => {
    const id  = parseInt(req.params.id);
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).render('error', { message: 'No file uploaded', user: req.user });
    }

    try {
        let resourceType: "image" | "video" | "raw" | "auto";

        if (req.file.mimetype.startsWith("image/")) {
            resourceType = "image";
        } else if (req.file.mimetype.startsWith("video/")) {
            resourceType = "video";
        } else if (req.file.mimetype.startsWith("audio/")) {
            resourceType = "raw"; 
        } else {
            resourceType = "auto";
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: `user_${userId}/folder_${id}`,
            resource_type: resourceType 
        });

        const file = await prisma.file.create({
            data: {
                name: req.file.filename,
                url: result.secure_url,
                size: req.file.size,
                userId,
                folderId: id,
                public_id: result.public_id,
                resource_type: resourceType
            }
        });

        fs.unlinkSync(req.file.path);
        res.redirect(`/folders/${id}`);
    } catch (error) {
        res.status(500).render('error', { message: 'Error uploading file', user: req.user });
    }
});


router.post("/", isAuthenticated, async (req: any, res: any) => {
    const {name, parentId} = req.body;
    const userId = req.user.id;

    try {
        const folder = await prisma.folder.create({
            data: {
                name,
                userId,
                parentId: parentId ? parseInt(parentId) : null,
            }
        })
        res.redirect("/folders")
    } catch(error){
        res.status(500).json({message: "Error creating folder"})
    }
});

router.get('/', isAuthenticated, async (req: any, res: any) => {
    const userId = req.user.id;
  
    try {
      const folders = await prisma.folder.findMany({
        where: { userId },
      });
      res.render('dashboard', { user: req.user, folders });
    } catch (error) {
      res.status(500).render('error', { message: 'Error fetching folders' });
    }
  });

router.get("/:id", isAuthenticated, async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        const folder = await prisma.folder.findUnique({
            where: {
                id, userId
            }
        })
        if (!folder){
            return res.status(404).render("error", {message: "Folder not found"});
        }

        const files = await prisma.file.findMany({
            where: {
                folderId: id, userId
            }
        })
        res.render("folder", {user: req.user, folder, files})
    } catch(error){
        res.render("error", {message: "Error fetching folder"});
    }
})

router.put("/:id", isAuthenticated, async (req: any, res: any) => {
    const {id} = req.params.id;
    const {name} = req.body;
    const userId = req.user.id;

    try {
        const folder = await prisma.folder.updateMany({
            where : {id: parseInt(id), userId},
            data: {name}
        })

        if (folder.count === 0) {
            return res.status(404).json({message: "Folder not found"});
        }

        const updatedFolder = await prisma.folder.findUnique({where: {id: parseInt(id)}});
        res.status(200).json(updatedFolder);
    } catch(error){
        res.status(500).json({message: "Error updating folder"});
    }
});

router.delete("/:id", isAuthenticated, async (req: any, res: any) => {
    const {id} = req.params;
    const userId = req.user.id;

    try {
        await prisma.file.deleteMany({
            where: {folderId: parseInt(id), userId}
        });
        const folder = await prisma.folder.deleteMany({
            where: {id: parseInt(id), userId}
        })

        if (folder.count === 0){
            res.status(404).json({message: "Folder not found"});
        }
        
        res.redirect("/folders")
    } catch(error){
        res.status(500).render('error', { message: 'Error deleting folder' });
    }
})

//Share folder
router.post("/:id/share", isAuthenticated, async (req: any, res: any) => {
    const id = parseInt(req.user.id);
    const {duration} = req.body;
    const userId = req.user.id;

    try {
        const shareLink = uuidv4();
        const shareExpires = addDays(new Date(), parseInt(duration));

        await prisma.folder.update({
            where: {id, userId},
            data: {shareLink, shareExpires}
        })

        res.render("shareLink", {
            user: req.user,
            shareLink: `${req.protocol}://${req.get('host')}/folders/share/${shareLink}`
        })
    } catch(error){
        res.status(500).render("error", {message: "Error sharing folder", user: req.user});
    }
})

router.get("/share/:shareLink", async (req, res) => {
    const {shareLink} = req.params;

    try {
        const folder = await prisma.folder.findUnique({
            where: {shareLink},
            include: {files: true}
        })

        if (!folder || (folder.shareExpires && folder.shareExpires < new Date())) {
            return res.status(404).render("error", { message: "Shared folder not found or link expired" });
        }

        res.render("sharedFolder", {folder, user: req.user})
    } catch(error){
        res.status(500).render("error", {message: "Error fetching shared folder"});
    }
})

export default router;