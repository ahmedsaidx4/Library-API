const jwt = require("jsonwebtoken"); // بنستدعي مكتبة JWT عشان نوقّع ونقرأ التوكنات

module.exports = async (payload) => {
  // الدالة الأساسية: بتعمل Access Token قصير العمر
  const token = await jwt.sign(payload, process.env.JWT_SECRET, {
    // بنوقّع الـ payload بالمفتاح السري
    expiresIn: "15m", // صلاحية الـ Access Token ربع ساعة بس
  });
  return token; // بنرجع التوكن عشان الكنترولر يبعته للعميل
};

module.exports.generateRefreshToken = async (payload) => {
  // دالة ثانية مربوطة بنفس الملف: بتعمل Refresh Token
  const refreshSecret = process.env.JWT_REFRESH_SECRET; // نفضّل مفتاح خاص للريفرش، ولو مش موجود نستخدم نفس JWT_SECRET

  const refreshToken = await jwt.sign(payload, refreshSecret, {
    // بنوقّع نفس بيانات المستخدم لكن بمفتاح الريفرش
    expiresIn: "7d", // صلاحية أطول: 7 أيام عشان يجدّد الـ Access Token من غير لوجين تاني
  });

  return refreshToken; // بنرجع الـ Refresh Token عشان يتحفظ في الداتابيز والكوكي
};
