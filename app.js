
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Define the database path
const dbPath = path.resolve(__dirname, './usersdata.db');
let db;

// Promise wrapper for the database `run` method
const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this); // `this` refers to the `sqlite3` statement object
            }
        });
    });
};

// Function to create the users table if it doesn't exist
const createTable = async () => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                department TEXT NOT NULL
            )
        `;
        await runQuery(createTableQuery);
        console.log("Users table created or already exists.");
    } catch (err) {
        console.error("Error creating table:", err.message);
    }
};

// Function to initialize the database (open and create table if needed)
const initializeDatabase = async () => {
    try {
        console.log("Initializing database...");

        // Create and connect to the SQLite database
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("Error connecting to the database:", err.message);
            } else {
                console.log("Connected to the SQLite database successfully.");
                createTable(); // Create table if it doesn't exist
            }
        });
    } catch (err) {
        console.error("Error initializing database:", err.message);
    }
};

// API routes

// Get all users
app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Database error' });
        } else {
            res.json(rows);
        }
    });
});

// Create a new user
app.post('/users', (req, res) => {
    const { firstName, lastName, email, department } = req.body;

    // Check if the user already exists based on the email
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Database error' });
        }

        if (row) {
            // User already exists
            return res.status(400).send({ message: 'User with this email already exists' });
        }

        // Insert the new user
        db.run(
            'INSERT INTO users (firstName, lastName, email, department) VALUES (?, ?, ?, ?)',
            [firstName, lastName, email, department],
            function (err) {
                if (err) {
                    return res.status(500).send({ error: 'Database error' });
                } else {
                    return res.status(201).json({ id: this.lastID, message: 'User created successfully' });
                }
            }
        );
    });
});

// Update a user
app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, department } = req.body;

    // Check if the user exists
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Database error' });
        }

        if (!row) {
            // User not found
            return res.status(404).send({ message: 'User not found' });
        }

        // Update the user
        db.run(
            'UPDATE users SET firstName = ?, lastName = ?, email = ?, department = ? WHERE id = ?',
            [firstName, lastName, email, department, id],
            function (err) {
                if (err) {
                    return res.status(500).send({ error: 'Database error' });
                } else {
                    return res.status(204).send(); // Successfully updated user, no content to send
                }
            }
        );
    });
});

// Delete a user
app.delete('/users/:id', (req, res) => {
    const { id } = req.params;

    // Check if the user exists
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).send({ error: 'Database error' });
        }

        if (!row) {
            // User not found
            return res.status(404).send({ message: 'User not found' });
        }

        // Delete the user
        db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
            if (err) {
                return res.status(500).send({ error: 'Database error' });
            } else {
                return res.status(204).send(); // Successfully deleted user, no content to send
            }
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeDatabase(); // Initialize database when the server starts
});
