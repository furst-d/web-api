import { Request } from 'express';

const controller = require("./user.controller");
const { authenticateUser, authorizeUser } = require("../auth/authManager");
const multer = require('multer');
const path = require('path');
const router = require("express").Router();

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, callBack: DestinationCallback) => {
        callBack(null, './public/images/');
    },
    filename: (_req: Request, file: Express.Multer.File, callBack: FileNameCallback) => {
        callBack(null, file.originalname.replace(path.extname(file.originalname), "") + '-' + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
});

router.post("/login", controller.login);
router.post("/register", authenticateUser, authorizeUser([6]), controller.register);
router.post("/activate", controller.activate);
router.post("/refresh-token", controller.refreshToken);
router.delete("/logout", authenticateUser, controller.logout);
router.get("/pages", authenticateUser, controller.getPages);
router.put("/:id", authenticateUser, authorizeUser([6]), controller.updateUser);
router.put("/:id/reset", authenticateUser, authorizeUser([6]), controller.resetAccount);
router.delete("/:id", authenticateUser, authorizeUser([6]), controller.deleteUser);
router.get("/avatar", authenticateUser, controller.getAvatar);
router.post("/avatar", authenticateUser, upload.single('image'), controller.uploadAvatar);
router.post("/change-password", authenticateUser, controller.passwordChange);
router.get("/", authenticateUser, authorizeUser([6]), controller.getUsers);
router.post("/friend-requests", authenticateUser, controller.sendFriendRequest);
router.put("/friend-requests/:id/accept", authenticateUser, controller.acceptFriendRequest);
router.put("/friend-requests/:id/reject", authenticateUser, controller.rejectFriendRequest);
router.delete("/friend-requests/:id", authenticateUser, controller.cancelFriendRequest);
router.delete("/friends/:id", authenticateUser, controller.removeFriend);

module.exports = router;