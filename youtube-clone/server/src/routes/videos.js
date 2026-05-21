// WHY: All video-related operations
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// PUBLIC ROUTES (no authentication needed)

// GET /api/videos - Get all videos (for homepage)
router.get('/', async (req, res, next) => {
    try {
        // Get latest 20 videos
        const videos = await prisma.video.findMany({
            take: 20, // Limit to 20
            orderBy: { createdAt: 'desc' }, // Newest first
            include: {
                user: { // Include the video creator's info
                    select: { username: true, avatar: true, id: true }
                },
                _count: { // Get count of likes and comments
                    select: { likes: true, comments: true }
                }
            }
        });

        res.json({ videos });
    } catch (error) {
        next(error);
    }
});

// GET /api/videos/:id - Get single video by ID
router.get('/:id', async (req, res, next) => {
    try {
        const video = await prisma.video.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: { username: true, avatar: true, id: true }
                },
                comments: {
                    include: {
                        user: { select: { username: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        res.json({ video });
    } catch (error) {
        next(error);
    }
});

// PROTECTED ROUTES (require authentication)

// POST /api/videos - Upload a new video (requires auth)
router.post('/', protect, async (req, res, next) => {
    try {
        // req.user is added by protect middleware
        const { title, description, url, thumbnail } = req.body;

        if (!title || !url) {
            return res.status(400).json({ message: 'Title and URL are required' });
        }

        const video = await prisma.video.create({
            data: {
                title,
                description,
                url,
                thumbnail,
                userId: req.user.id // Connect to logged-in user
            },
            include: {
                user: { select: { username: true, avatar: true } }
            }
        });

        res.status(201).json({ video });
    } catch (error) {
        next(error);
    }
});

// PUT /api/videos/:id - Update video (only owner can update)
router.put('/:id', protect, async (req, res, next) => {
    try {
        // First, check if user owns this video
        const video = await prisma.video.findUnique({
            where: { id: req.params.id },
            select: { userId: true }
        });

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        if (video.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own videos' });
        }

        // Update the video
        const updated = await prisma.video.update({
            where: { id: req.params.id },
            data: {
                title: req.body.title,
                description: req.body.description,
                thumbnail: req.body.thumbnail
            }
        });

        res.json({ video: updated });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/videos/:id - Delete video (only owner)
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const video = await prisma.video.findUnique({
            where: { id: req.params.id },
            select: { userId: true }
        });

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        if (video.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own videos' });
        }

        // Delete all related data first (comments, likes)
        await prisma.$transaction([
            prisma.comment.deleteMany({ where: { videoId: req.params.id } }),
            prisma.like.deleteMany({ where: { videoId: req.params.id } }),
            prisma.video.delete({ where: { id: req.params.id } })
        ]);

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// POST /api/videos/:id/like - Like or dislike video
router.post('/:id/like', protect, async (req, res, next) => {
    try {
        const { value } = req.body; // 1 for like, -1 for dislike
        const videoId = req.params.id;

        // Check if user already liked/disliked this video
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_videoId: { // Using the @@unique constraint from schema
                    userId: req.user.id,
                    videoId: videoId
                }
            }
        });

        if (existingLike) {
            // Update existing like
            const updated = await prisma.like.update({
                where: { id: existingLike.id },
                data: { value: value }
            });
            return res.json({ like: updated });
        } else {
            // Create new like
            const like = await prisma.like.create({
                data: {
                    value: value,
                    userId: req.user.id,
                    videoId: videoId
                }
            });
            return res.status(201).json({ like });
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/videos/:id/comments - Add comment
router.post('/:id/comments', protect, async (req, res, next) => {
    try {
        const { text } = req.body;
        const videoId = req.params.id;

        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const comment = await prisma.comment.create({
            data: {
                text: text,
                userId: req.user.id,
                videoId: videoId
            },
            include: {
                user: { select: { username: true, avatar: true } }
            }
        });

        res.status(201).json({ comment });
    } catch (error) {
        next(error);
    }
});

module.exports = router;