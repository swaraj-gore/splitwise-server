const express = require('express');
const mysql = require('mysql2');

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
    const groupId = isNaN(+req.params.groupId) ? null : +req.params.groupId;
    const userId = req.userId;
    const query = 'call get_group(?, ?)';
    connection.query(query, [groupId, userId], (err, result) => {
        if (err) {
            res.status(500).json({message: "Error occured while fetching the Group"})
        }
        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: 'Group not found' });
        }
    });
})

// Define a route to get settlement summary for a group
router.get('/:groupId/summary', (req, res) => {
    const groupId = isNaN(req.params.groupId) ? null : req.params.groupId;
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

// Define a route to get balance lent summary
router.get('/:groupId/lent', (req, res) => {
    const groupId = isNaN(req.params.groupId) ? null : req.params.groupId;
    const userId = req.userId;

    const getLentSummaryQuery = 'call get_individual_balances_lent(?)';
    const checkGroupQuery = 'call is_user_member_of_group(?, ?)';

    connection.query(checkGroupQuery, [userId, groupId], (err, results) => {
        if(results[0].length === 0) {
            res.status(404).json({message: "Group not found!"});
            return;
        }
        connection.query(getLentSummaryQuery, [groupId], (err, result) => {
            if(err) res.status(500).json({message: "Error while fetching lent summary!"})
            else
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

// Define route to add members ot the group
router.post('/:groupId/members', (req, res) => {
    const groupId = req.params.groupId;
    const memberIds = req.body.memberIds; // Array of user IDs
    // Create an array of arrays for bulk insertion
    const values = memberIds.map(memberId => [groupId, memberId]);
  
    // Insert the members into the groupmember table
    const query = 'INSERT INTO groupmember (group_id, user_id) VALUES ?';
    connection.query(query, [values], (err, result) => {
      if (err) {
        console.error('Error adding members:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      return res.status(200).json({ message: 'Members added successfully' });
    });
  });


// Define route to get non-members of group
router.get('/:groupId/nonmembers', (req, res) => {
    const groupId = isNaN(req.params.groupId) ? null : req.params.groupId;
    const userId = req.userId;
    // Get all users who are not part of the current group
    const getNonMembersQuery = `
      SELECT user_id, name
      FROM splitwiseuser
      WHERE user_id NOT IN (
        SELECT user_id
        FROM groupmember
        WHERE group_id = ?
      )
    `;
    const checkGroupQuery = "call is_user_member_of_group(?, ?)";
    // check if user is member of group
    connection.query(checkGroupQuery, [userId, groupId], (err, result) => {
        if(result[0].length === 0) {
            res.status(404).json({message: "Group not found!"});
            return;
        }
        connection.query(getNonMembersQuery, [groupId], (err, result) => {
            if (err) {
              console.error('Error fetching non-members:', err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }
            return res.status(200).json(result);
        });
    })
  });


// Deinfe route to get members of group
router.get('/:groupId/members', (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;
    const getMembersQuery = `
      SELECT u.user_id, u.name, u.email
      FROM groupmember gm
      INNER JOIN splitwiseuser u ON gm.user_id = u.user_id
      WHERE gm.group_id = ?
    `;
    const checkGroupQuery = "call is_user_member_of_group(?, ?)";
    // check if user is member of group
    connection.query(checkGroupQuery, [userId, groupId], (err, result) => {
        if(result[0].length === 0) {
            res.status(404).json({message: "Group not found!"});
            return;
        }
        // Execute the query
        connection.query(getMembersQuery, [groupId], (error, results) => {
            if (error) {
                console.error('Error retrieving group members:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                // Return the results as JSON
                res.json(results);
            }
        });
    })
});
  
// Define route to delete member of group
router.delete('/:groupId/members/:memberId', (req, res) => {
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;
  
    const deleteQuery = `DELETE FROM groupmember WHERE group_id = ? AND member_id = ?`;
  
    connection.query(deleteQuery, [groupId, memberId], (error, results) => {
      if (error) {
        console.error('Error deleting member from group:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      if (results.affectedRows === 0) {
        // No rows were affected, member or group not found
        return res.status(404).json({ error: 'Member or group not found' });
      }
  
      res.status(200).json({ message: 'Member removed from group successfully' });
    });
});
  
  

module.exports = router;