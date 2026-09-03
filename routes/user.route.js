const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verfiyToken");
const createValid = require("../utils/user.validator");
const validateRes = require("../middleware/validate");
const controller = require("../controllers/user.controller");
const borrowRouter = require("../routes/borrow.route");
const { app } = require("../server");
router.use("/:userId/borrows", borrowRouter);
router.use("/:userId/borrows/:borrowId", borrowRouter);
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Success
 */
router
  .route("/")
  .get(verifyToken, controller.getAllUser)
  .post(controller.postUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Success
 */
router.route("/profile").get(verifyToken, controller.profile);

/**
 * @swagger
 * /api/users/:userId:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Success
 *   delete:
 *     summary: delete users
 *     responses:
 *       200:
 *         description: Success
 *   patch:
 *     summary: patch users
 *     responses:
 *       200:
 *         description: Success
 */

router
  .route("/:userId")
  .get(controller.getSingleUser)
  .delete(controller.deleteUser)
  .patch(controller.patchUser);
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: register users
 *     responses:
 *       200:
 *         description: Success
 */
router.route("/register").post(createValid, validateRes, controller.register);
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: login users
 *     parameters:
 *       - name: username
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.route("/login").post(controller.login);

module.exports = router;
