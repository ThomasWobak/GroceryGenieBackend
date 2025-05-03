const express = require('express');
const router = express.Router();
const pool = require('../pool'); 
const bcrypt = require('bcrypt'); // Hashing passwords

router.use(express.json()); 

router.post('/create', async (req, res) => {
  const { auth0_key, username, email, password, profile_picture } = req.body;

  if (!auth0_key || !username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdAt = new Date();
    await pool.query(
        `INSERT INTO public."user" (auth0_key, username, email, password, profile_picture, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [auth0_key, username, email, hashedPassword, profile_picture || null, createdAt]
      );
      
    res.status(201).json({ message: 'User created successfully', userId: auth0_key });

  } catch (err) {
    console.error('Error inserting user:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/update/:auth0_key', async (req, res) => {
    const auth0_key = req.params.auth0_key;
    const { username, email, password, profile_picture } = req.body;
  
    // No update if no fields provided
    if (!username && !email && !password && profile_picture === undefined) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
  
    let setClause = '';
    let values = [];
    let paramIndex = 1;
  
    if (username) {
      setClause += `username = $${paramIndex}, `;
      values.push(username);
      paramIndex++;
    }
  
    if (email) {
      setClause += `email = $${paramIndex}, `;
      values.push(email);
      paramIndex++;
    }
  
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      setClause += `password = $${paramIndex}, `;
      values.push(hashed);
      paramIndex++;
    }
  
    if (profile_picture !== undefined) {
      setClause += `profile_picture = $${paramIndex}, `;
      values.push(profile_picture);
      paramIndex++;
    }
  
    // Remove trailing comma and space
    setClause = setClause.slice(0, -2);
  
    try {
      values.push(auth0_key); // Final value for WHERE clause
      const result = await pool.query(
        `UPDATE public."user" SET ${setClause} WHERE auth0_key = $${paramIndex}`,
        values
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json({ message: 'User updated successfully' });
    } catch (err) {
      console.error('Error updating user:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

module.exports = router;
