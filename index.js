const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Use the express-session middleware
app.use(session({
    secret: 'your-secret-key', // Change this to a secure secret
    resave: false,
    saveUninitialized: true
}));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'appuser',
    password: 'mini',
    database: 'forum_app',
});

connection.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to the database');
});
global.db = connection;

// Define routes here

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/users', (req, res) => {
    // Check if the user is logged in
    if (req.session.user) {
        // Fetch users from the database
        connection.query('SELECT * FROM users', (error, results) => {
            if (error) throw error;
            res.render('users', { users: results, username: req.session.user.username });
        });
    } else {
        // Redirect to the login page if the user is not logged in
        res.redirect('/login');
    }
});



app.get('/posts', (req, res) => {
    // Fetch posts with user information from the database
    connection.query('SELECT posts.*, users.username AS user_username FROM posts INNER JOIN users ON posts.user_id = users.id', (error, results) => {
        if (error) {
            throw error;
        }
        res.render('posts', { posts: results });
    });
});



app.get('/newPost', (req, res) => {
    // Fetch topics for dropdown
    connection.query('SELECT * FROM topics', (error, topics) => {
        if (error) throw error;
        res.render('newPost', { topics });
    });
});

app.post('/newPost', (req, res) => {
    const { title, content, topic_id } = req.body;
    const user_id = req.session.user ? req.session.user.id : null;

    console.log('Received form data:', { title, content, user_id, topic_id });

    // Insert new post into the database
    connection.query(
        'INSERT INTO posts (title, content, user_id, topic_id) VALUES (?, ?, ?, ?)',
        [title, content, user_id, topic_id],
        (error, results) => {
            if (error) {
                console.error('Database insertion error:', error);
                throw error;
            }

            console.log('Post added successfully:', results);

            res.redirect('/posts');
        }
    );
});



app.get('/search', (req, res) => {
    const query = req.query.q; // Get search query from the URL
    // Implement search logic based on the query
    // Fetch matching posts from the database
    connection.query(
        'SELECT * FROM posts WHERE title LIKE ? OR content LIKE ?',
        [`%${query}%`, `%${query}%`],
        (error, results) => {
            if (error) throw error;
            res.render('search', { results, query });
        }
    );
});

app.get('/about', (req, res) => {
    res.render('about');
});

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Store user information in the session
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.render('login', { errorMessage: 'User does not exist.' });
        }
    });
});

// Registration route
app.get('/register', (req, res) => {
    res.render('register');
});

// app.post('/register', (req, res) => {
//     const { username, password } = req.body;

//     db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err, result) => {
//         if (err) throw err;
//         res.redirect('/');
//     });
// });

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    // Validate input (you should add more validation and error handling)
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    // Check if the username is already taken
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            return res.status(409).send('Username is already taken.');
        }

        // If the username is not taken, insert the new user into the database
        connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (error) => {
            if (error) throw error;

            res.redirect('/login'); // Redirect to the login page after successful registration
        });
    });
});


// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the web app listening
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
