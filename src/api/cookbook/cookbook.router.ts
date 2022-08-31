const controller = require("./cookbook.controller");
const { authenticateUser} = require("../auth/authManager");
const router = require("express").Router();


router.get("/allergens", authenticateUser, controller.getAllergens);
router.get("/ingredients", authenticateUser, controller.getIngredients);
router.post("/ingredients", authenticateUser, controller.addIngredient);
router.get("/ingredient-units", authenticateUser, controller.getIngredientUnits);

module.exports = router;