const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const asyncWrapper = require("../middleware/errorHandler");
const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");

const getAllUser = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = query.limit || 5;
  const page = query.page || 1;
  const skip = (page - 1) * limit;
  const users = await User.find({}, { password: false })
    .limit(limit)
    .skip(skip);
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { users } });
});

const getSingleUser = asyncWrapper(async (req, res, next) => {
  const user = await User.findById({ _id: req.params.userId });
  if (!user) {
    const error = new appError("User Not Found", 401, httpStatusText.FAIL);
    return next(error);
  }
  return res.status(200).json({ status: "success", data: user });
});

const postUser = asyncWrapper(async (req, res, next) => {
  const { name, email, password } = req.body;

  const findEmail = await User.findOne({ email: email });
  if (findEmail) {
    const error = new appError("Email Already Exist", 401, httpStatusText.FAIL);
    return next(error);
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
  });
  await newUser.save();

  return res.status(201).json({
    status: "success",
    data: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
  });
});

const patchUser = asyncWrapper(async (req, res, next) => {
  const userId = req.params.userId;
  const user = await User.updateOne({ _id: userId }, { $set: { ...req.body } });
  return res.status(201).json({
    status: "success",
    data: { user },
  });
});

const deleteUser = asyncWrapper(async (req, res, next) => {
  const user = await User.findByIdAndDelete({ _id: req.params.userId });
  if (!user) {
    const error = new appError(
      "User Already Deleted",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
  return res
    .status(200)
    .json({ status: httpStatusText.SUCCESS, message: "User Has Deleted" });
});

module.exports = {
  getAllUser,
  getSingleUser,
  postUser,
  patchUser,
  deleteUser,
};
