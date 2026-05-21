// WHY: User profile and channel management
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/users/:id - Get user profile (public)
router.get('/:id', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                username: true,
                avatar: true,
                createdAt: true,
                _count: {
                    select: {
                        videos: true,
                        subscribers: true  // We'll add this later
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's videos
        const videos = await prisma.video.findMany({
            where: { userId: req.params.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { likes: true, comments: true } }
            }
        });

        res.json({ user, videos });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/profile - Update own profile (authenticated)
router.put('/profile', protect, async (req, res, next) => {
    try {
        const { username, avatar, about } = req.body;

        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                username: username || req.user.username,
                avatar: avatar || req.user.avatar,
                about: about || ''
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                about: true
            }
        });

        res.json({ user: updated });
    } catch (error) {
        next(error);
    }
});

// GET /api/users/:id/videos - Get all videos by user
router.get('/:id/videos', async (req, res, next) => {
    try {
        const videos = await prisma.video.findMany({
            where: { userId: req.params.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { likes: true, comments: true } }
            }
        });

        res.json({ videos });
    } catch (error) {
        next(error);
    }
});

module.exports = router;