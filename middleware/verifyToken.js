const jwt = require('jsonwebtoken');

const JWT_SECRET =
    process.env.JWT_SECRET || 'supersecretkey_university_erp';

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token.',
        });
    }
};

module.exports = verifyToken;