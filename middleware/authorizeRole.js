const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized.',
            });
        }

        const userRole = req.user.role;
        const adminType = req.user.adminType;

        const hasAccess =
            allowedRoles.includes(userRole) ||
            allowedRoles.includes(adminType);

        if (!hasAccess) {
            return res.status(403).json({
                message: 'You do not have permission to access this resource.',
            });
        }

        next();
    };
};

module.exports = authorizeRole;