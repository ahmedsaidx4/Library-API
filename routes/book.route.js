const express = require("express");
const router = express.Router({ mergeParams: true });

const controller = require("../controllers/book.controller");
const borrowRoute = require("../routes/borrow.route.js");
router.use("/:bookId/borrows", borrowRoute);
router.route("/").get(controller.getAllBook).post(controller.postBook);

router.route("/:bookId").get(controller.getSingleBook);

module.exports = router;
