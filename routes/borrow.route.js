const express = require("express");
const router = express.Router({ mergeParams: true });
const controller = require("../controllers/borrow.controller");

router.route("/").post(controller.postBorrow).get(controller.getAllBorrow);
router.route("/:borrowId").patch(controller.updateBorrow);
module.exports = router;
