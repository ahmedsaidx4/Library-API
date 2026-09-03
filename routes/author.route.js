const express = require("express");
const router = express.Router({ mergeParams: true });

const controller = require("../controllers/author.controller");
const bookRoute = require("../routes/book.route");
router.use("/:authorId/books", bookRoute);
router.route("/").get(controller.getAllAuthor).post(controller.postAuthor);

router
  .route("/:authorId")
  .get(controller.getSingleAuthor)
  .patch(controller.patchAuthor);

module.exports = router;
