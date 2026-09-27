const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verfiyToken");
const createValid = require("../utils/user.validator");
const validateRes = require("../middleware/validate");
const {
  login,
  register,
  logout,
  profile,
  refresh,
  forgetPassword,
  getResetPasswordPage,
  resetPassword,
} = require("../controllers/auth.controller");

router.route("/profile").get(verifyToken, profile);

router.route("/register").post(createValid, validateRes, register);

router.route("/login").post(login);

router.route("/refresh").post(refresh);

router.route("/logout").post(logout);

router.route("/forget-password").post(forgetPassword);

router
  .route("/reset-password/:userId/:token")
  .get(getResetPasswordPage) // بيفتح صفحة الـ EJS
  .post(resetPassword); // بيستقبل الباسورد الجديد ويحدثه

module.exports = router;
