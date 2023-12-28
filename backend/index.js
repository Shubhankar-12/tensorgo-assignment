require('dotenv').config()
const express = require('express');
const mysql = require('mysql');
const cors = require('cors')
const axios = require('axios');
const fs = require('fs');
const json2csv = require('json2csv').parse;

const app = express();
app.use(cors())
const port = 8800;
const apiEndpoint = 'https://gorest.co.in/public/v2/users'

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.dbpassword,
    database: 'userdb',
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

async function fetchDataFromApi() {
    try {
        const response = await axios.get(apiEndpoint, {
            headers: {
                Authorization: `Bearer ${process.env.token}`,
            },
        });
        const data = response.data;
        if (data && data.length > 0) {
            const users = data;

            for (const user of users) {
                user.created_at = new Date();
                user.updated_at = new Date();
                db.query('INSERT INTO users SET ?', user, (err, result) => {
                    if (err) {
                        console.error('Error storing user data:', err);
                    } else {
                        console.log('User data stored successfully');
                    }
                });
            }
        } else {
            console.log('No user data in the API response.');
        }
    } catch (error) {
        console.error('Error fetching data from API:', error);
    } finally {
        db.end();
    }
}

app.get('/api/fetch', (req, res) => {
    fetchDataFromApi();
    res.send("Data Fetched!")
});

app.get('/api/users', (req, res) => {

    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.json(results);
        }
    });
});

app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const updatedDetails = {
        name: req.query.name,
        email: req.query.email,
        status: req.query.status,
        gender: req.query.gender,
    };

    db.query('UPDATE users SET ? WHERE id = ?', [updatedDetails, userId], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            res.status(500).send('Internal Server Error');
        } else {
            db.query('SELECT * FROM users WHERE id = ?', [userId], (err, rows) => {
                if (err) {
                    console.error('Error fetching updated user details:', err);
                    res.status(500).send('Internal Server Error');
                } else {
                    if (rows.length > 0) {
                        const updatedUser = rows[0];
                        console.log('User updated successfully:', updatedUser);
                        res.json(updatedUser);
                    } else {
                        console.error('User not found after update');
                        res.status(404).send('User not found after update');
                    }
                }
            });
        }
    });
});


app.get('/api/csv', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Internal Server Error');
        } else {
            const csvData = json2csv(results, { header: true });

            fs.writeFile('users.csv', csvData, err => {
                if (err) {
                    console.error('Error writing to CSV file:', err);
                } else {
                    console.log('CSV file generated successfully');
                }
                db.end();
            });
            res.status(200).send("<h3>CSV Generated!!!</h3>")
        }
    });
})

app.listen(port, () => {
    console.log(`Server started at ${port}`);
});