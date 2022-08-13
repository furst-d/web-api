const {
    login,
    register,
    refreshToken,
    logout,
    getPages,
    activate
} = require("./user.controller");
const { authenticateUser, authorizeUser } = require("../auth/authManager");
const router = require("express").Router();

router.post("/login", login);
router.post("/register", authenticateUser, authorizeUser([6]), register);
router.post("/activate", activate);
router.post("/refresh-token", refreshToken);
router.delete("/logout", authenticateUser, logout);
router.get("/pages", authenticateUser, getPages);

module.exports = router;