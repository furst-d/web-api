const {
    login,
    register,
    refreshToken,
    logout,
    getPages
} = require("./user.controller");
const { authenticateToken } = require("../auth/authManager");
const router = require("express").Router();

router.post("/login", login);
router.post("/register", authenticateToken, register);
router.post("/refresh-token", refreshToken);
router.delete("/logout", logout);
router.get("/pages", authenticateToken, getPages);

module.exports = router;