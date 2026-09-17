const authorizeRole = (...allowedRoles) => {
    // Flatten any nested arrays and convert to uppercase strings
    const flatRoles = allowedRoles.flat(Infinity).map((r) => String(r).toUpperCase());

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized.',
            });
        }

        const userRole = String(req.user.role || '').toUpperCase();
        const adminType = String(req.user.adminType || '').toUpperCase();

        const hasAccess =
            flatRoles.includes(userRole) ||
            flatRoles.includes(adminType) ||
            userRole === 'SUPER_ADMIN' ||
            adminType === 'SUPER_ADMIN';

        if (!hasAccess) {
            return res.status(403).json({
                message: 'You do not have permission to access this resource.',
            });
        }

        next();
    };
};

module.exports = authorizeRole;