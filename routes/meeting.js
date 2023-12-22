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

router.post('/meeting/join', (req, res) => {
    console.log("Join meeting post request");
    const {meetingId, passcode} = req.body;
    console.log(meetingId, passcode);
    // Redirect to meeting page which will establish websocket connection
    res.redirect(`/meeting/${meetingId}`);
});

router.get('/meeting/:meetingId', (req, res) => {
    console.log("with id", req.params.meetingId);
    res.sendFile(path.join(__dirname, '../', 'views', 'attendee_meeting_view.html'));
});


module.exports = router;

