const controller = require("./cookbook.controller");
const { authenticateUser} = require("../auth/authManager");
const router = require("express").Router();


router.get("/allergens", authenticateUser, controller.getAllergens);
router.get("/ingredients", authenticateUser, controller.getIngredients);
router.post("/ingredients", authenticateUser, controller.addIngredient);
router.put("/ingredients/:id", authenticateUser, controller.updateIngredient);
router.delete("/ingredients/:id", authenticateUser, controller.deleteIngredient);
router.get("/ingredient-units", authenticateUser, controller.getIngredientUnits);

module.exports = router;