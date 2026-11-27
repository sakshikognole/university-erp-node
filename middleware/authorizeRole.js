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

        const effectiveRoles = new Set([userRole, adminType].filter(Boolean));

        // Administrative equivalence
        if (effectiveRoles.has('SUPER_ADMIN') || effectiveRoles.has('ADMIN') || effectiveRoles.has('SUB_ADMIN')) {
            effectiveRoles.add('SUPER_ADMIN');
            effectiveRoles.add('ADMIN');
            effectiveRoles.add('SUB_ADMIN');
        }

        // Teaching / Staff equivalence
        if (effectiveRoles.has('TEACHER') || effectiveRoles.has('FACULTY') || effectiveRoles.has('STAFF')) {
            effectiveRoles.add('TEACHER');
            effectiveRoles.add('FACULTY');
            effectiveRoles.add('STAFF');
        }

        const hasAccess =
            flatRoles.some((r) => effectiveRoles.has(r)) ||
            effectiveRoles.has('SUPER_ADMIN');

        if (!hasAccess) {
            return res.status(403).json({
                message: 'You do not have permission to access this resource.',
            });
        }

        next();
    };
};

module.exports = authorizeRole;