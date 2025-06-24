const {AUTH0_BASE_URL} = require("../constants");
require('dotenv').config()
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
const M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;
const MGMT_API_AUDIENCE = process.env.AUTH0_BASE_URL

let cachedAccessToken = null;
let tokenExpiryTime = 0;

function isTokenValid() {
    return cachedAccessToken !== null&& Date.now() < tokenExpiryTime - 60 * 1000;
}

async function fetchNewManagementApiToken(){
    console.log("Fetching new Auth0 Management API token...");
    try {
        const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: M2M_CLIENT_ID,
                client_secret: M2M_CLIENT_SECRET,
                audience: MGMT_API_AUDIENCE,
                grant_type: 'client_credentials'
            })
        })
        const data = await response.json();
        if (response.ok){
            cachedAccessToken = data.access_token;
            tokenExpiryTime = Date.now() + (data.expires_in * 1000);
            console.log("New Auth0 Management API token fetched successfully.");
            return cachedAccessToken
        } else {
            console.error("Failed to fetch Auth0 Management API token:", data);
            throw new Error(data.error_description || 'Unknown error');
        }
    } catch (error) {
        console.error("Error fetching Auth0 Management API token:", error);
        throw error;
    }
}

async function getManagementApiToken() {
    if (isTokenValid()) {
        return cachedAccessToken;
    } else {
        return await fetchNewManagementApiToken();
    }
}

async function callManagementApi(endpoint, options = {}) {
    const token = await getManagementApiToken();
    const url = AUTH0_BASE_URL;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${url}${endpoint}`, {
        ...options,
        headers,
    })

    const data = await response.json()
    if (!response.ok){
        console.error("Auth0 Management API error:", data);
        throw new Error(`Auth0 Management API error: ${data.message}`);
    }
    return data;
}

async function changeUserProfilePicture(userId, pictureUrl) {
    const endpoint = `users/${userId}`;
    const options = {
        method: 'PATCH',
        body: JSON.stringify({
            picture: pictureUrl
        })
    };

    try {
        const result = await callManagementApi(endpoint, options);
        console.log("User profile picture updated successfully:", result);
        return result;
    } catch (error) {
        console.error("Error updating user profile picture:", error);
        throw error;
    }
}

async function getAllUserProfilePictures() {
    const endpoint = 'users';
    try {
        const result = await callManagementApi(endpoint);
        return result.map(user => ({user_id: user.user_id, picture: user.picture}));
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
}

module.exports = {
    changeUserProfilePicture,
    getAllUserProfilePictures
}