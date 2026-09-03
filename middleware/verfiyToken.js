const jwt = require('jsonwebtoken')
const appError = require('../utils/appError')
const httpStatusText = require('../utils/httpStatusText')

module.exports = async (req, res, next) => {
    const authHeader = req.headers['Authorization'] || req.headers['authorization']
    if (!authHeader) {
        const error = new appError('Token Is Require', 401, httpStatusText.FAIL)
        return next(error)
    }
    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.decoded = decoded
        next()
    } catch (err) {
        const error = new appError('Invalid Token', 401, httpStatusText.ERROR)
        return next(error)
    }
}