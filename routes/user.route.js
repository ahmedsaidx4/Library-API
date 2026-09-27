const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verfiyToken");
const controller = require("../controllers/user.controller");
const borrowRouter = require("../routes/borrow.route");

router.use("/:userId/borrows", borrowRouter);
router.use("/:userId/borrows/:borrowId", borrowRouter);

router
  .route("/")
  .get(verifyToken, controller.getAllUser)
  .post(controller.postUser);

router
  .route("/:userId")
  .get(controller.getSingleUser)
  .delete(controller.deleteUser)
  .patch(controller.patchUser);

module.exports = router;
