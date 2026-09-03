const Borrow = require("../models/borrow.model");
const asyncWrapper = require("../middleware/errorHandler");
const Book = require("../models/book.model");
const User = require("../models/user.model");
const appError = require("../utils/appError");

const postBorrow = asyncWrapper(async (req, res, next) => {
  console.log(req.params);
  console.log(req.body);
  if (!req.body.user) req.body.user = req.params.userId;

  const { user, book, returnedAt } = req.body;
  const bookFindInBook = await Book.findById({ _id: req.body.book });
  const bookFindInBorrow = await Borrow.findOne({
    book: req.body.book,
    status: "borrowed",
  });
  // const statusFind = await Borrow.findOne({
  //   book: req.body.book,
  //   status: "borrowed",
  // });

  const userFind = await User.findById({
    _id: req.body.user || req.params.user,
  });
  if (!userFind) {
    const error = new appError("The User Not Found", 404, "FAIL");
    return next(error);
  }
  if (!bookFindInBook) {
    const error = new appError("The Book Not Found", 404, "FAIL");
    return next(error);
  }
  // if (bookFindInBorrow) {
  //   if (statusFind) {
  //     const error = new appError("The Book Already Borrow", 404, "FAIL");
  //     return next(error);
  //   } else {
  //     const updateBorrow = await Borrow.updateOne(
  //       { _id: bookFindInBorrow._id },
  //       { $set: { status: "borrowed" } },
  //       { now: true },
  //     );
  //     return res.status(201).json({
  //       status: "success",
  //       data: { updateBorrow },
  //     });
  //   }
  // }

  if (bookFindInBorrow) {
    const error = new appError("The Book Already Borrow", 404, "FAIL");
    return next(error);
  }

  const addBorrow = new Borrow({
    user,
    book,
    returnedAt,
  });
  await addBorrow.save();
  res.json({ addBorrow });
});

const updateBorrow = asyncWrapper(async (req, res, next) => {
  const updateBorrow = await Borrow.updateOne(
    { _id: req.params.borrowId },
    { $set: { status: "returned", ...req.body } },
    { now: true },
  );
  return res.status(201).json({
    status: "success",
    data: { updateBorrow },
  });
});

const getAllBorrow = asyncWrapper(async (req, res) => {
  let filterObject = {};
  if (req.params.userId) filterObject = { user: req.params.userId };
  else if (req.params.bookId) filterObject = { book: req.params.bookId };

  const borrows = await Borrow.find(filterObject)
    .populate("user")
    .populate("book");

  res.json({ borrows });
});

module.exports = {
  postBorrow,
  getAllBorrow,
  updateBorrow,
};
