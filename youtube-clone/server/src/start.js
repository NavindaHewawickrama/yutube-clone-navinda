require('dotenv').config(); //loads .env variables into process.env
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

// MIDDLEWARE - Functions that run on EVERY request
// Order matters! These run top to bottom

app.use(express.json()); // Parses JSON request bodies (req.body)
app.use(cookieParser()); // Parses cookies (req.cookies)
app.use(cors({
    origin: 'http://localhost:3000', // Allow React frontend
    credentials: true // Allow cookies
}));

// ERROR HANDLING - Must be LAST middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Something broke!'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});