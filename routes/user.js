const express = require('express');
const mysql = require('mysql');

const router = express.Router();

// Create a MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Define a route get User by userId;
router.get('', (req, res) => {
    const userId = req.query.userId;
    const getUserQuery = 'SELECT name, email FROM splitwiseuser WHERE user_id = ?';
    connection.query(getUserQuery, [userId], (err, result) => {
        if(result.length === 0) {
            res.status(404).json({message: "User not found!"});
            return;
        }
        res.status(200).json(result[0]);
    })
})

module.exports = router;