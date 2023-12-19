const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/meeting/start', (req, res) => {
    console.log("Meeting page");
    res.sendFile(path.join(__dirname, '../', 'views', 'start_meeting.html'));
});

router.get('/meeting/join', (req, res)=> {
    console.log("Joining a meeting");
    res.sendFile(path.join(__dirname, '../', 'views', 'join_meeting.html'));
});




module.exports = router;