const express = require("express");
const router = express.Router();

const controller = require("../controllers/category.controller");
const bookRoute = require("../routes/book.route");
router.use("/:categoryId/books", bookRoute);
router.route("/").get(controller.getAllCategory).post(controller.postCategory);

router.route("/:categoryId").get(controller.getSingleCategory);

module.exports = router;
