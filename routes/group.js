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

// Define a route to get group by id
router.get('/:groupId', (req, res) => {
    const groupId = +req.params.groupId;
    const userId = req.userId;
    const query = 'call get_group(?, ?)';
    connection.query(query, [groupId, userId], (err, result) => {
        if (err) console.log(err);

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: 'Group not found' });
        }
    });
})

// Define a route to get settlement summary for a group
router.get('/:groupId/summary', (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;
    const checkGroupQuery = 'call is_user_member_of_group(?, ?)'
    const getSummaryQuery = 'call calculate_settlement_summary(?)';

    connection.query(checkGroupQuery, [userId, groupId], (err, results) => {
        if(results[0].length === 0) {
            res.status(404).json({message: "Group not found!"});
            return;
        }

        connection.query(getSummaryQuery, [groupId], (err, result) => {
            res.status(200).json(result[0]);
        })
        
    })
})

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

// Define a route to add existing member to existing group
router.post('/:groupId/add-member', (req, res) => {
    const groupId = req.params.groupId;
    const { newMemberId } = req.body;
    const userId = req.userId;

    const checkGroupQuery = "\
        SELECT group_id\
        FROM groupmember\
        WHERE user_id = ? AND group_id = ?;\
    "

    const addMemberQuery = "\INSERT INTO `Groupmember` VALUES(?, ?)"

    connection.query(checkGroupQuery, [userId, groupId], (err, result) => {
        if(result.length === 0) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        
        connection.query(addMemberQuery, [groupId, newMemberId], (err) => {
            if(err) {
                res.status(404).json({message: "Member doesn't exists!"})
                return;
            }
            res.status(201).json({message: "Member added successfully!"})
        })
    })
})

module.exports = router;