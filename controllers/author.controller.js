const Author = require("../models/author.model");
const asyncWrapper = require("../middleware/errorHandler");

const getAllAuthor = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = query.limit || 5;
  const page = query.page || 1;
  const skip = (page - 1) * limit;
  const authors = await Author.find({}, { password: false })
    .limit(limit)
    .skip(skip);
  res.status(200).json({ status: "success", data: { authors } });
});

const getSingleAuthor = asyncWrapper(async (req, res, next) => {
  const author = await Author.findById({ _id: req.params.authorId });
  if (!author) {
    return res.status(404).json({ status: "FAIL", data: "Author Not Found!" });
  }
  return res.status(200).json({ status: "success", data: author });
});

const postAuthor = asyncWrapper(async (req, res, next) => {
  const { name, bio } = req.body;
  const newAuthor = new Author({
    name,
    bio,
  });
  await newAuthor.save();

  return res.status(201).json({
    status: "success",
    data: { newAuthor },
  });
});

const patchAuthor = asyncWrapper(async (req, res, next) => {
  const authorId = req.params.authorId;
  const author = await Author.updateOne(
    { _id: authorId },
    { $set: { ...req.body } },
  );
  return res.status(201).json({
    status: "success",
    data: { author },
  });
});
module.exports = {
  getAllAuthor,
  getSingleAuthor,
  postAuthor,
  patchAuthor,
};
