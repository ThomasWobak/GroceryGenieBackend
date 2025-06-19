const express = require('express');
const router = express.Router();
const pool = require('../pool');
const constants = require('../constants');
const managementApi = require('../auth0api/Auth0ManagementApi')

router.use(express.json()); 

router.post('/create', async (req, res) => {
    const auth0_key = req.auth.payload.sub;
    console.log("Create called with", auth0_key);

    if (!auth0_key) {
        return res.status(400).json({ error: 'Missing authorization' });
    }

    try {
        const result = await pool.query(`SELECT * FROM public."user" WHERE auth0_key = $1`, [auth0_key]);
        if (result.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

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



router.patch('/profilePicture', async (req, res) => {
    const auth0_key = req.auth.payload.sub;
    const base64Image = req.body.base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    if (!base64Image) {
        return res.status(400).json({ error: 'Missing base64 image data' });
    }

    const formData = new FormData();
    formData.append('image', base64Image)
    formData.append('type', 'base64');

    try{
        const response = await fetch("https://api.imgur.com/3/image", {
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${constants.IMGUR_CLIENT_ID}`,
            },
            body: formData
        })
        const data = await response.json();
        if(response.ok && data.success) {
            const imageUrl = data.data.link;
            console.log("Image uploaded successfully:", imageUrl);
            await managementApi.changeUserProfilePicture(auth0_key, imageUrl)
            res.status(200).json({ message: 'Profile picture updated successfully', imageUrl });
        }else {
            res.status(500).json({ error: 'Failed to upload image to Imgur' });
            console.error('Error uploading image to Imgur:', data);
        }
    }catch (err){
        console.error(err)
        res.status(500).json({ error: 'Internal server error' });
    }

})

module.exports = router;
