const {
    login,
    register,
    refreshToken,
    logout,
    getPages,
    activate,
    updateUser,
    resetAccount,
    deleteUser,
    getUsers
} = require("./user.controller");
const { authenticateUser, authorizeUser } = require("../auth/authManager");
const router = require("express").Router();

router.post("/login", login);
router.post("/register", authenticateUser, authorizeUser([6]), register);
router.post("/activate", activate);
router.post("/refresh-token", refreshToken);
router.delete("/logout", authenticateUser, logout);
router.get("/pages", authenticateUser, getPages);
router.put("/:id", authenticateUser, authorizeUser([6]), updateUser);
router.put("/:id/reset", authenticateUser, authorizeUser([6]), resetAccount);
router.delete("/:id", authenticateUser, authorizeUser([6]), deleteUser);
router.get("/", authenticateUser, authorizeUser([6]), getUsers);

module.exports = router;