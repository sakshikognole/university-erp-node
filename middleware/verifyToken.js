const jwt = require('jsonwebtoken');

const JWT_SECRET =
    process.env.JWT_SECRET || 'supersecretkey_university_erp';

const verifyToken = (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                message: 'Access denied. No token provided.',
            });
        }

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