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

// Define a route to add an expense
router.post('/create',(req, res) => {
  const { description, amount, expense_date, group_id } = req.body;
  const userId = req.userId;

  const checkGroupQuery = "call is_user_member_of_group(?, ?)";
  const createExpenseQuery = 'INSERT INTO Expense (description, amount, expense_date, user_id, group_id) VALUES (?, ?, ?, ?, ?)';

  // check if user is member of group
  connection.query(checkGroupQuery, [userId, group_id], (err, result) => {
    if(result.length === 0) {
      res.status(404).json({message: "Group not found!"})
    }

    // Add expense
    connection.query(createExpenseQuery, [description, amount, expense_date, userId, group_id], (err) => {
      if (err) {
        res.status(500).json({ error: 'Error adding expense' });
        console.log(err);
        return;
      }
   
      // Send a success response
      res.status(201).json({ message: 'Expense added successfully' });
    });

  })
});

// route to fetch expense by groupId
router.get('', (req, res) => {
  const groupId = isNaN(+req.query.groupId) ? null : +req.query.groupId;
  const userId = req.userId;
  const getExpenseQuery = 'SELECT * from expense WHERE group_id = ?';
  const checkGroupQuery = "call is_user_member_of_group(?, ?)";
  // check if user is member of group
  connection.query(checkGroupQuery, [userId, groupId], (err, result) => {
    if(err) {
      res.status(500).json("Error in fetching expenses!");
      return;
    }
    if(result[0].length === 0) {
      res.status(404).json({message: "Group not found!"})
      return;
    }
    connection.query(getExpenseQuery, [groupId], (err, result) => {
        if(err) {
          res.status(500).json({message: "Error while fetching the"})
        }
        res.json(result);
    })
  })
})

// Define route to fetch expene by expenseId
router.get('/:expenseId', (req, res) => {
  const expenseId = req.params.expenseId;
  const userId = req.userId;

  const query = `
    SELECT *
    FROM Expense
    where expense_id = ?
  `;

  connection.query(query, [expenseId], (err, result) => {
    if(err) {
      res.status(500).json({message: "Error while fetching expense!"})
      return;
    }
    if(result?.length === 0) {
      res.status(404).json({message: "Expense not found!"});
      return;
    }
    const groupId = result[0].group_id;
    const checkGroupQuery = "call is_user_member_of_group(?, ?)";
    // check if user is member of group
    connection.query(checkGroupQuery, [userId, groupId], (err, groupResult) => {
      if(err) {
        res.status(500).json("Error while fetching expenses!");
        return;
      }
      if(groupResult[0].length === 0) {
        res.status(404).json({message: "User doesn't belong to this Group!"})
        return;
      }
      res.status(200).json(result[0]);
    })
  })
})

module.exports = router