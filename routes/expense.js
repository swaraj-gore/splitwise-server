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
        return;
      }
   
      // Send a success response
      res.status(201).json({ message: 'Expense added successfully' });
    });

  })
});

module.exports = router