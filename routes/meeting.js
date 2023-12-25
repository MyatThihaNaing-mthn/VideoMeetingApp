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
    let {meetingId, passcode} = req.body;
    // Define an asynchronous function to use await
    const handleJoinMeeting = async () => {
        try {
            meetingId = Number(meetingId);
            passcode = Number(passcode);
            console.log(typeof meetingId, meetingId);
            console.log(typeof passcode, passcode);
            const meeting = await meetingExist(meetingId, passcode);

            if (meeting) {
                // Redirect to the meeting page, which will establish a WebSocket connection
                const attendeId = uuidv4();
                meeting.attendeId = attendeId;
                // will catch on redirected route
                req.session.attendeId = attendeId;
                await db().collection(collectionName).updateOne({meetingId, passcode}, {$set: meeting});
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
    console.log("with attendeid", req.session.attendeId);
    const attendeId = req.session.attendeId;
    const meetingId = req.params.meetingId;
    res.render('attendee_meeting_view', {attendeId: attendeId, meetingId: meetingId});
});


module.exports = router;

async function meetingExist(meetingId, passcode) {
    try {
        const meeting = await db().collection(collectionName).findOne({ meetingId, passcode });
        if (meeting) {
            console.log("found meeting");
            return meeting;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error checking if meeting exists:", error);
        return null; // Handle the error and return false
    }
}
