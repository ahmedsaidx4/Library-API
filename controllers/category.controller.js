const Category = require("../models/category.model");
const asyncWrapper = require("../middleware/errorHandler");

const postCategory = asyncWrapper(async (req, res) => {
  const { name, description } = req.body;
  const newCategory = await Category.create({
    name,
    description,
  });
  res.json(newCategory);
});

const getAllCategory = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = query.limit || 5;
  const page = query.page || 1;
  const skip = (page - 1) * limit;
  const categorys = await Category.find({}, { password: false })
    .limit(limit)
    .skip(skip);
  res.status(200).json({ status: "success", data: { categorys } });
});

const getSingleCategory = asyncWrapper(async (req, res, next) => {
  const category = await Category.findById({ _id: req.params.categoryId });
  if (!category) {
    return res
      .status(404)
      .json({ status: "FAIL", data: "Category Not Found!" });
  }
  return res.status(200).json({ status: "success", data: category });
});

module.exports = {
  postCategory,
  getAllCategory,
  getSingleCategory,
};
