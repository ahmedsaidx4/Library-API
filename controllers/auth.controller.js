const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { myEmitter } = require("../utils/EvenRegisterLog");
const generateToken = require("../middleware/generateToken"); // الدالة الأساسية بتعمل Access Token
const asyncWrapper = require("../middleware/errorHandler");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const generateRefreshToken = generateToken.generateRefreshToken;
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const getRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET;
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

//-------------------------Register User------------------------------------------

module.exports.register = asyncWrapper(async (req, res, next) => {
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
  const refreshToken = await generateRefreshToken({
    id: newUser._id,
    email: newUser.email,
  });
  newUser.token = token;
  newUser.refreshToken = refreshToken;
  await newUser.save();
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { newUser },
  });
  myEmitter.emit("userRegisterSuccessFul", newUser);
});

//-------------------------Login User------------------------------------------

module.exports.login = asyncWrapper(async (req, res, next) => {
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
    const refreshToken = await generateRefreshToken({
      id: user._id,
      email: user.email,
    });
    user.token = token;
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);
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

//-------------------------Logout User------------------------------------------

module.exports.logout = asyncWrapper(async (req, res, next) => {
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
    secure: true,
  });

  return res.status(200).json({
    // اللوج آوت ناجح حتى لو مكنش فيه توكن (Idempotent)
    status: httpStatusText.SUCCESS,
    message: "Logged Out Successfully",
  });
});

//-------------------------Refresh Access Token------------------------------------------

module.exports.refresh = asyncWrapper(async (req, res, next) => {
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

//-------------------------Profile User------------------------------------------

module.exports.profile = asyncWrapper(async (req, res, next) => {
  const { id } = req.decoded;
  const user = await User.findById(id, { password: false });

  res.json({ status: httpStatusText.SUCCESS, data: user });
});

//-------------------------Forget Password (بيبعت لينك الريست بالإيميل)------------------------------------------
// دي الخطوة الأولى: المستخدم بيبعت إيميله وإحنا بنبعتله لينك فيه توكن صالح 10 دقايق

module.exports.forgetPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    const error = new appError("Email Is Required", 400, httpStatusText.FAIL);
    return next(error);
  }

  const user = await User.findOne({ email }).exec();
  if (!user) {
    // بنرجع نفس الرسالة سواء الإيميل موجود أو لأ كان أفضل أمنيًا، لكن هنسيبها زي ما كانت عشان توضح الرسالة للمستخدم
    const error = new appError("Email Not Found", 404, httpStatusText.FAIL);
    return next(error);
  }

  // السر بيتكون من JWT_SECRET + الباسورد هاش الحالي، فلو الباسورد اتغيّر التوكن القديم بيبطل تلقائي
  const secret = process.env.JWT_SECRET + user.password;
  const token = jwt.sign({ email: user.email, id: user._id }, secret, {
    expiresIn: "10m",
  });

  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT}`;
  const link = `${baseUrl}/api/auth/reset-password/${user._id}/${token}`;

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.USER_MAIL,
      pass: process.env.USER_PASS,
    },
  });

  const mailOption = {
    from: process.env.USER_MAIL,
    to: user.email,
    subject: "Reset Password",
    html: `<div>
              <h4>Click the link below to reset your password</h4>
              <p>This link is valid for 10 minutes only.</p>
              <a href="${link}">${link}</a>
      </div>`,
  };

  try {
    await transport.sendMail(mailOption);
  } catch (err) {
    const error = new appError(
      "Failed To Send Reset Email",
      500,
      httpStatusText.ERROR,
    );
    return next(error);
  }

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Reset Password Link Sent To Your Email",
  });
});

//-------------------------Show Reset Password Page------------------------------------------
// دي صفحة الـ EJS اللي المستخدم بيدخلها من اللينك اللي في الإيميل (GET)، مفيهاش أي تحقق من التوكن
// لأن التحقق الفعلي بيحصل لما هو يبعت الباسورد الجديد (POST)

module.exports.getResetPasswordPage = (req, res) => {
  res.render("reset-password");
};

//-------------------------Reset Password (استلام الباسورد الجديد)------------------------------------------
// دي الخطوة التانية: المستخدم بيبعت الباسورد الجديد من الفورم، وهنا بنتحقق من التوكن فعليًا

module.exports.resetPassword = asyncWrapper(async (req, res, next) => {
  const { userId, token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    const error = new appError(
      "Password Must Be At Least 6 Characters",
      400,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  const user = await User.findById(userId).exec();
  if (!user) {
    const error = new appError("User Not Found", 404, httpStatusText.FAIL);
    return next(error);
  }

  try {
    const secret = process.env.JWT_SECRET + user.password;
    jwt.verify(token, secret);
  } catch (err) {
    const error = new appError(
      "Invalid Or Expired Token",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  const hashPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashPassword;
  user.token = undefined;
  user.refreshToken = undefined;
  await user.save();

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Password Updated Successfully",
  });
});
