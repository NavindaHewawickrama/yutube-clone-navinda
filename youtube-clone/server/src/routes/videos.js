const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const router = express.Router();

// Middleware to check auth
const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: 'Please login' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) return res.status(401).json({ message: 'User not found' });

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// GET all videos
router.get('/', async (req, res) => {
    try {
        const videos = await prisma.video.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true, avatar: true } }
            }
        });
        res.json({ videos });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single video
router.get('/:id', async (req, res) => {
    try {
        const video = await prisma.video.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { username: true, avatar: true } },
                comments: {
                    include: { user: { select: { username: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!video) return res.status(404).json({ message: 'Video not found' });
        res.json({ video });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create video (requires auth)
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, url } = req.body;

        const video = await prisma.video.create({
            data: {
                title,
                description,
                url,
                userId: req.user.id
            },
            include: { user: { select: { username: true } } }
        });

        res.status(201).json({ video });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//POST add comment to a video
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { text } = req.body;
        const videoId = req.params.id;

        // Validate input
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const comment = await prisma.comment.create({
            data: {
                text: text,
                userId: req.user.id,    // From protect middleware (logged-in user)
                videoId: videoId         // From URL parameter
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        })

        res.status(201).json({
            success: true,
            comment: comment
        });

    } catch (error) {
        console.error('Comment error:', error);
        res.status(500).json({ message: error.message });
    }
})

module.exports = router;