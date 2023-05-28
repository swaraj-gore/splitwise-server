require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

const authRoutes = require('./routes/auth')
const groupRoutes = require('./routes/group')
const expenseRoutes = require('./routes/expense')

const verifyToken = require('./middleware/verifyToken')

app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Mount the auth routes
app.use('/auth', authRoutes);

// verify the token for all the routes below
app.use(verifyToken)

// Mount the groups routes
app.use('/groups', groupRoutes)

// Mount the expense routes
app.use("/expenses", expenseRoutes)

const port = 3000;

// Create a MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Connect to the MySQL server
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    return;
  }
  console.log('Connected to the database!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});