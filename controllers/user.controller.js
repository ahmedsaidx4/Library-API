const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // محتاجينها عشان نتحقق من الـ Refresh Token في refresh و logout
const asyncWrapper = require("../middleware/errorHandler");

const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");
const { myEmitter } = require("../utils/EvenRegisterLog");
const generateToken = require("../middleware/generateToken"); // الدالة الأساسية بتعمل Access Token
const generateRefreshToken = generateToken.generateRefreshToken; // بنطلع دالة الريفرش اللي اتعملت على نفس الموديول

const refreshCookieOptions = {
  // إعدادات كوكي الريفرش عشان المتصفح يبعتها لوحده من غير JavaScript
  httpOnly: true, // المتصفح مش هيقدر يقرأ الكوكي من JS (حماية من XSS)
  sameSite: "strict", // الكوكي مش هتتبعت لطلبات من مواقع تانية (حماية من CSRF)
  secure: process.env.NODE_ENV === "production", // في الإنتاج الكوكي تتم على HTTPS بس
  maxAge: 7 * 24 * 60 * 60 * 1000, // عمر الكوكي 7 أيام بالميلي ثانية (نفس صلاحية الريفرش)
};

const getRefreshSecret = () => {
  // دالة صغيرة ترجع مفتاح توقيع الريفرش
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET; // لو مفيش JWT_REFRESH_SECRET نستخدم نفس سر الـ Access Token
};

const setRefreshCookie = (res, refreshToken) => {
  // بنحط الريفرش في كوكي الـ response
  res.cookie("refreshToken", refreshToken, refreshCookieOptions); // الاسم refreshToken عشان نقرأه بعدين من req.cookies.refreshToken
};

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
  const token = await generateToken({ id: newUser._id, email: newUser.email }); // Access Token قصير العمر
  const refreshToken = await generateRefreshToken({
    // Refresh Token أطول عمر عشان يجدّد الجلسة
    id: newUser._id, // نفس الـ id جوه التوكن عشان نعرف مين المستخدم لما نجدد
    email: newUser.email, // الإيميل كمان جزء من الـ payload
  });
  newUser.token = token; // بنحفظ الـ Access Token في الداتابيز
  newUser.refreshToken = refreshToken; // بنحفظ الريفرش عشان نقارنه بعدين ونلغيه في اللوج آوت
  await newUser.save(); // حفظ المستخدم بالتوكنين مع بعض
  setRefreshCookie(res, refreshToken); // بنبعت الريفرش ككوكي httpOnly للمتصفح

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { newUser }, // بنرجع الاتنين في الـ JSON كمان لو العميل مش بيستخدم كوكيز
  });
  myEmitter.emit("userRegisterSuccessFul", newUser);
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
    const token = await generateToken({ id: user._id, email: user.email }); // Access Token جديد بعد اللوجين
    const refreshToken = await generateRefreshToken({
      // ريفرش جديد لكل جلسة لوجين
      id: user._id, // هوية المستخدم جوه التوكن
      email: user.email, // الإيميل جوه الـ payload
    });
    user.token = token; // تحديث آخر Access Token محفوظ
    user.refreshToken = refreshToken; // أي ريفرش قديم بيتبدل (الجلسات القديمة تبطل)
    await user.save(); // حفظ التوكنين في الداتابيز
    setRefreshCookie(res, refreshToken); // الكوكي للمتصفح
    myEmitter.emit("userLoginSuccessFul", user);

    return res
      .status(200)
      .json({ status: httpStatusText.SUCCESS, token, refreshToken });
  } else {
    res
      .status(500)
      .json({ status: httpStatusText.ERROR, data: "somthing error" });
  }
});

//-------------------------Refresh Access Token------------------------------------------

const refresh = asyncWrapper(async (req, res, next) => {
  // لما الـ Access Token يخلص، العميل ينادي هنا
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken; // نحاول نجيبه من الكوكي أولاً، ولو مفيش من الـ body

  if (!refreshToken) {
    // مفيش ريفرش أصلاً
    const error = new appError( // نبني خطأ موحّد زي باقي المشروع
      "Refresh Token Is Required", // الرسالة اللي هترجع للعميل
      401, // Unauthorized
      httpStatusText.FAIL, // نوع الحالة fail مش error سيرفر
    );
    return next(error); // نبعت الخطأ لميدل وير الأخطاء ونوقف الدالة
  }

  let decoded; // هنحط فيها بيانات التوكن بعد التحقق
  try {
    // التحقق ممكن يرمي خطأ لو التوكن بايظ أو منتهي
    decoded = jwt.verify(refreshToken, getRefreshSecret()); // نفك التوقيع ونتأكد إنه سليم
  } catch (err) {
    // التوقيع غلط أو المدة خلصت
    const error = new appError( // نرجّع 401 من غير ما نكشف تفاصيل jwt
      "Invalid Refresh Token",
      401,
      httpStatusText.ERROR,
    );
    return next(error); // خروج من الدالة بعد تمرير الخطأ
  }

  const user = await User.findById(decoded.id); // نجيب المستخدم من الـ id اللي جوه التوكن
  if (!user) {
    // التوكن سليم لكن المستخدم اتمسح
    const error = new appError("User Not Found", 404, httpStatusText.FAIL);
    return next(error);
  }

  if (user.refreshToken !== refreshToken) {
    // التوكن اللي في الطلب لازم يطابق اللي محفوظ (بعد لوج آوت أو لوجين جديد يبقى القديم باطل)
    const error = new appError(
      "Refresh Token Does Not Match",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  const token = await generateToken({ id: user._id, email: user.email }); // Access Token جديد
  const newRefreshToken = await generateRefreshToken({
    // بندوّر الريفرش كمان عشان القديم ميتسرقش ويتستخدم
    id: user._id,
    email: user.email,
  });

  user.token = token; // تحديث الـ Access Token المحفوظ
  user.refreshToken = newRefreshToken; // الريفرش القديم يبطل فورًا
  await user.save(); // كتابة التغييرات في MongoDB
  setRefreshCookie(res, newRefreshToken); // تحديث الكوكي عند العميل

  return res.status(200).json({
    // رد النجاح
    status: httpStatusText.SUCCESS,
    token, // الـ Access Token الجديد تستخدمه في Authorization
    refreshToken: newRefreshToken, // الريفرش الجديد لو العميل مش معتمد على الكوكي
  });
});

//-------------------------Logout User------------------------------------------

const logout = asyncWrapper(async (req, res, next) => {
  // بنلغي الجلسة من السيرفر والمتصفح
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken; // نفس مصدر التوكن زي refresh

  if (refreshToken) {
    // لو فيه ريفرش نمسحه من الداتابيز، لو مفيش نكتفي بمسح الكوكي
    try {
      // نحاول نفك التوكن عشان نلاقي المستخدم بالـ id (أسرع وأدق)
      const decoded = jwt.verify(refreshToken, getRefreshSecret()); // لو التوكن لسه صالح هنعرف الـ id
      await User.findByIdAndUpdate(decoded.id, {
        // نحدّث المستخدم ده
        $unset: { token: 1, refreshToken: 1 }, // $unset بيمسح الحقلين من الوثيقة
      });
    } catch (err) {
      // لو التوكن منتهي أو بايظ، نحاول نلاقي المستخدم بنفس نص الريفرش
      await User.updateOne(
        // بحث بالحقل refreshToken
        { refreshToken: refreshToken }, // شرط المطابقة
        { $unset: { token: 1, refreshToken: 1 } }, // برضو نمسح التوكنين لو لقينا الصف
      );
    }
  }

  res.clearCookie("refreshToken", {
    // نطلب من المتصفح يحذف الكوكي
    httpOnly: true, // لازم نفس الإعدادات اللي اتحطت بيها الكوكي عشان تتمسح
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    // اللوج آوت ناجح حتى لو مكنش فيه توكن (Idempotent)
    status: httpStatusText.SUCCESS,
    message: "Logged Out Successfully",
  });
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
  refresh, // POST /api/users/refresh
  logout, // POST /api/users/logout
};
