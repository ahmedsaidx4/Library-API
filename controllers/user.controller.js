const User = require("../models/user.model");
const bcrypt = require("bcrypt");

const asyncWrapper = require("../middleware/errorHandler");

const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");

const generateToken = require("../middleware/generateToken");

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

const profile = asyncWrapper(async (req, res, next) => {
  const { id } = req.decoded;
  const user = await User.findById(id, { password: false });

  res.json({ status: httpStatusText.SUCCESS, data: user });
});

//-------------------------Register User------------------------------------------

const register = asyncWrapper(async (req, res, next) => {
  const { name, email, password } = req.body;
  const user = await User.findOne({ email: email });
  if (user) {
    const error = new appError("Email Already Exist", 401, httpStatusText.FAIL);
    return next(error);
  }
  const hashPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    name,
    email,
    password: hashPassword,
  });
  const token = await generateToken({ id: newUser._id, email: newUser.email });
  newUser.token = token;
  await newUser.save();
  res
    .status(201)
    .json({ status: httpStatusText.SUCCESS, data: { newUser, token } });
});

//-------------------------Login User------------------------------------------

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const error = new appError(
      "Email And Password Are Require",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    const error = new appError("Email not Found", 404, httpStatusText.FAIL);
    return next(error);
  }
  const matchPassword = await bcrypt.compare(password, user.password);
  if (!matchPassword) {
    const error = new appError("Password Wrong", 404, httpStatusText.FAIL);
    return next(error);
  }
  if (user && matchPassword) {
    const token = await generateToken({ id: user._id, email: user.email });
    user.token = token;
    await user.save();

    return res.status(200).json({ status: httpStatusText.SUCCESS, token });
  } else {
    res
      .status(500)
      .json({ status: httpStatusText.ERROR, data: "somthing error" });
  }
});

module.exports = {
  getAllUser,
  getSingleUser,
  postUser,
  patchUser,
  deleteUser,
  register,
  login,
  profile,
};
