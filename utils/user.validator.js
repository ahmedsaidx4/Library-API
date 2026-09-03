
const { body } = require('express-validator')

const createUserValidate = [
    body('name')
        .notEmpty()
        .isLength({ min: 2 })
        .withMessage('Name Is Required'),
    body('email')
        .isEmail()
        .notEmpty()
        .withMessage('Email Is Required'),
    body('password')
        .notEmpty().withMessage('Password Is Required')
        .isLength({ min: 6 }).withMessage('isLength most 6 number')
]


module.exports = createUserValidate

