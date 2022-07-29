const {
    login,
    register,
    refreshToken,
    logout,
    testAuth
} = require("./user.controller");
const { authenticateToken } = require("../../auth/authManager");
const router = require("express").Router();

router.post("/login", login);
router.post("/register", /*authenticateToken,*/ register);
router.post("/refresh-token", refreshToken);
router.delete("/logout", logout);
router.get("/test", authenticateToken, testAuth);

module.exports = router;