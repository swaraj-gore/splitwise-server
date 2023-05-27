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

// Define a route to get all groups
router.get('/', (req, res) => {
    const query = 'call get_groups(?)';
    const userId = req.userId;
    // Execute the query
    connection.query(query,[userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error retrieving groups' });
            return;
        }
        // Send the groups as a response
        res.json(results[0]);
    });
});

module.exports = router;