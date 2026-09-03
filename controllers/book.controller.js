const Book = require("../models/book.model");
const asyncWrapper = require("../middleware/errorHandler");

const postBook = asyncWrapper(async (req, res) => {
  const { title, description, publishedYear, author, category } = req.body;
  const newBook = await Book.create({
    title,
    description,
    publishedYear,
    author,
    category,
  });
  res.json(newBook);
});

const getAllBook = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = query.limit || 5;
  const page = query.page || 1;
  const skip = (page - 1) * limit;
  let filterObject = {};
  if (req.params.authorId)
    filterObject = {
      author: req.params.authorId,
    };
  else if (req.params.categoryId)
    filterObject = {
      category: req.params.categoryId,
    };

  const books = await Book.find(filterObject)
    .limit(limit)
    .skip(skip)
    .populate("author")
    .populate("category");
  res.status(200).json({ status: "success", data: { books } });
});

const getSingleBook = asyncWrapper(async (req, res, next) => {
  const book = await Book.findById({ _id: req.params.bookId });
  if (!book) {
    const error = new appError("Book Not Found", 404, httpStatusText.FAIL);
    return next(error);
  }
  return res.status(200).json({ status: "success", data: book });
});

module.exports = {
  postBook,
  getAllBook,
  getSingleBook,
};
