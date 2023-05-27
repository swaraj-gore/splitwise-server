const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql');

const router = express.Router();

// Create a MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Register endpoint
router.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const checkEmailQuery = 'SELECT COUNT(*) AS count FROM splitwiseuser WHERE email = ?';
    connection.query(checkEmailQuery, [email], (error, result) => {
        if (error) {
            return res.status(500).json({ error: 'Error during user registration' });
        }

        const count = result[0].count;

        if (count > 0) {
            return res.status(400).json({ message: 'EMAIL_EXISTS' });
        }
    
        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error during password hashing' });
            }
        
            // Insert user into the database
            const sql = 'INSERT INTO splitwiseuser (name, email, password) VALUES (?, ?, ?)';
            connection.query(sql, [name, email, hashedPassword], (error, result) => {
                if (error) {
                    return res.status(500).json({ error: 'Error during user registration' });
                }
            
                const userId = result.insertId;
            
                // Create a JWT token
                const token = jwt.sign({ userId }, 'your_secret_key', {
                    expiresIn: '1h',
                });

                // Get the expiration time in seconds
                const expiresIn = jwt.decode(token).exp;
            
                return res.status(200).json({ userId, name, email, token, expiresIn });
            });
        });  
    });    
});

// Login endpoint
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Find the user by email in the database
    const sql = 'SELECT * FROM splitwiseuser WHERE email = ?';
    connection.query(sql, [email], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error during user login' });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(401).json({ message: 'INVALID_CREDENTIALS' });
        }

        const user = results[0];
  
        // Compare password hash
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                return res.status(500).json({ error: 'Error during password comparison' });
            }

            if (!match) {
                return res.status(401).json({ message: 'INVALID_CREDENTIALS' });
            }

            // Create a JWT token
            const token = jwt.sign({ userId: user.user_id }, 'your_secret_key', {
                expiresIn: '1h',
            });

            // Get the expiration time in seconds
            const expiresIn = jwt.decode(token).exp;

            return res.status(200).json({ "userId" : user.user_id, "name": user.name, "email": user.email,  token, expiresIn });
        });
    });
});

module.exports = router;
