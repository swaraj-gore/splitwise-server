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

// Route to add a group and insert into groupmember table
router.post('/create', (req, res) => {
    const { name } = req.body;

    const insertIntoGroupQuery = 'INSERT INTO `Group` (`name`) VALUES (?)';
    const insertIntoGroupMemberQuery = 'INSERT INTO `Groupmember` values(?, ?)';
    // Execute the query
    connection.query(insertIntoGroupQuery, [name], (err, result) => {
    if (err) {
        console.error('Error creating group: ', err);
        res.status(500).json({ error: 'Error creating group' });
        return;
    }
    const groupId = result.insertId;
    const userId = req.userId;
    connection.query(insertIntoGroupMemberQuery, [groupId, userId], (err) => {
        if(err) {
        res.status(500).json({ error: 'Error creating group' });
        return;
        }
    })
    // Send the newly created group ID as a response
        res.status(201).json({ group_id: result.insertId });
    });
});

module.exports = router;