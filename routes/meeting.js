const express = require('express');
const router = express.Router();
const path = require('path');
const {v4 : uuidv4} = require('uuid');
const {db} = require('../utils/databaseUtils');
const collectionName = "meetings";

router.get('/meeting/start', (req, res) => {
    console.log("Meeting page");
    const userId = uuidv4();
    res.render('start_meeting', {userId : userId});
});

router.get('/meeting/join', (req, res)=> {
    console.log("Joining a meeting");
    res.sendFile(path.join(__dirname, '../', 'views', 'join_meeting.html'));
});

router.post('/meeting/join', (req, res) => {
    console.log("Join meeting post request");
    const {meetingId, passcode} = req.body;
    console.log(meetingId, passcode);
    // Define an asynchronous function to use await
    const handleJoinMeeting = async () => {
        try {
            const meetingExists = await meetingExist(Number(meetingId), Number(passcode));

            if (meetingExists) {
                // Redirect to the meeting page, which will establish a WebSocket connection
                res.redirect(`/meeting/${meetingId}`);
            } else {
                res.status(404).send("No meeting found");
            }
        } catch (error) {
            console.error("Error checking if meeting exists:", error);
            res.status(500).send("Internal Server Error");
        }
    };
    handleJoinMeeting();
    
});

router.get('/meeting/:meetingId', (req, res) => {
    console.log("with id", req.params.meetingId);
    res.sendFile(path.join(__dirname, '../', 'views', 'attendee_meeting_view.html'));
});


module.exports = router;

async function meetingExist(meetingId, passcode) {
    try {
        const meeting = await db().collection(collectionName).findOne({ meetingId, passcode });
        if (meeting) {
            console.log("found meeting");
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error checking if meeting exists:", error);
        return false; // Handle the error and return false
    }
}
