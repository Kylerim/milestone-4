const express = require('express');
const { adduser, login, loginWithSession, logout } = require('../controllers/auth');
const router = express.Router();



router.post('/adduser', adduser)
router.post('/login', login)
router.get('/loginwithsession', loginWithSession)
router.get('/logout', logout)
// router.post('/verify', verify)
// router.get('/verify', verify)


module.exports = router