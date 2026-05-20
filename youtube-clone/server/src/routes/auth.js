// WHY: Handles user login/signup with Google
const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// GOOGLE OAUTH FLOW:
// 1. Frontend gets Google token
// 2. Sends to this endpoint
// 3. We verify and create/find user
// 4. Return our own JWT token

router.post('/google', async (req, res, next) => {
    try {
        // req.body contains the Google token from frontend
        const { googleToken, email, name, avatar } = req.body;

        // WHY: We trust Google's authentication, but still verify
        // In production, verify googleToken with Google's API

        // Find or create user in our database
        let user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            // New user - create account
            user = await prisma.user.create({
                data: {
                    email: email,
                    username: name,
                    avatar: avatar || 'https://default-avatar.png'
                }
            });
            console.log(`New user created: ${email}`);
        } else {
            console.log(`Existing user logged in: ${email}`);
        }

        // Create JWT - this is what proves user is authenticated
        // WHY JWT? It's stateless - server doesn't need to store sessions
        const jwtToken = jwt.sign(
            { id: user.id, email: user.email }, // Payload (data inside token)
            process.env.JWT_SECRET, // Secret key (set in .env)
            { expiresIn: '7d' } // Token expires in 7 days
        );

        // Send token as HTTP-Only Cookie (more secure than localStorage)
        res.cookie('token', jwtToken, {
            httpOnly: true,  // Can't be accessed by JavaScript (prevents XSS)
            secure: false,   // Set to true if using HTTPS
            sameSite: 'lax', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // Send user data (excluding sensitive info)
        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar
            }
        });

    } catch (error) {
        next(error);
    }
});

// Logout - just clear the cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Check if user is authenticated (for frontend to verify)
router.get('/me', async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, username: true, avatar: true }
        });

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

module.exports = router;