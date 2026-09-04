const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  token: { // بنخزن آخر Access Token اتعمل للمستخدم
    type: String, // نص عادي لأن JWT عبارة عن string
  },
  refreshToken: { // بنخزن الـ Refresh Token عشان نقدر نتحقق منه ونلغيه عند اللوج آوت
    type: String, // نفس الفكرة: JWT محفوظ كنص في الداتابيز
  },
});

module.exports = mongoose.model("User", userSchema, "users");
