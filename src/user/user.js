const express = require('express');
const router = express.Router();
const pool = require('../pool'); 

router.use(express.json()); 

router.post('/create', async (req, res) => {
    const { auth0_key } = req.body;
    console.log("Create called with", req.body)

    if (!auth0_key) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await pool.query(
            `INSERT INTO public."user" (auth0_key)
            VALUES ($1)`,
            [auth0_key]
        );
        
        res.status(201).json({ message: 'User created successfully', userId: auth0_key });

    } catch (err) {
        console.error('Error inserting user:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
