// WHY: This runs before protected routes to verify user identity
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// THIS IS A MIDDLEWARE FUNCTION - It runs BEFORE route handlers
// Pattern: (req, res, next) => { ... next() }

const protect = async (req, res, next) => {
    try {
        // 1. Get token from cookie
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: 'Not authorized - no token provided'
            });
        }

        // 2. Verify token is valid (not tampered with or expired)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                message: 'Not authorized - invalid token'
            });
        }

        // 3. Find user in database using the id from token
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, username: true, avatar: true }
        });

        if (!user) {
            return res.status(401).json({
                message: 'User no longer exists'
            });
        }

        // 4. Attach user to request object for route handlers to use
        req.user = user;

        // 5. Move to next middleware or route handler
        next();

    } catch (error) {
        next(error);
    }
};

module.exports = { protect };