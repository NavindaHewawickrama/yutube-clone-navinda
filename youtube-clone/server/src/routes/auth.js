const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();  // Simple! No adapters needed
const router = express.Router();

// Google login (simplified)
router.post('/google', async (req, res) => {
    try {
        const { email, name } = req.body;

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    username: name || email.split('@')[0]
                }
            });
            console.log('New user created:', email);
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ user: { id: user.id, email: user.email, username: user.username } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Auth failed' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: 'Not logged in' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        res.json({ user });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

module.exports = router;