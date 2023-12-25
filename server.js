const http = require('http');
const express = require('express');
const homeRoute = require('./routes/home');
const meetingRoute = require('./routes/meeting')
const path = require('path');
const { WebSocket } = require('ws');
const app = express();
const bodyParser = require('body-parser');
const { off } = require('process');
const { initDb, db } = require('./utils/databaseUtils');
const session = require('express-session');
const collectionName = "meetings";

const activeMeetings = [];



const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server: server });

//connect to db before staring server
startServer();


app.set('view engine', 'ejs');

//middlewares
app.use(session({secret: "mySecretMetting", resave: false, saveUninitialized: false}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(meetingRoute);
app.use(homeRoute);



wsServer.on('connection', ws => {
    console.log("websocket connection established");

    //handle message
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.offer) {
            const createAndSaveMeeting = async()=> {
                try{
                    const meeting = {};
                    const meetingId = await generateMeetingId();
                    const passcode = generatePasscode();
                    console.log("passcode", passcode);
                    //store infon in meeting object
                    meeting.meetingId = meetingId;
                    meeting.passcode = passcode;
                    meeting.offer = parsedMessage.offer.offerSDP;
                    meeting.hostId = parsedMessage.offer.hostId;
                    meeting.host = ws;
                    meeting.attendeId = undefined;
                    meeting.attende = undefined; // initialize undefined
                    meeting.answer = undefined; // initialize undefined, not available yet

                    // save it to mongodb
                    await saveToDb(meeting);

                    //add to acitve meeting array for ws connection retrieval
                    const meetingObj = {[meetingId]: {'host': ws, 'attende': undefined}};
                    activeMeetings.push(meetingObj);
                    
                    //send meetingId to the host
                    ws.send(JSON.stringify({'MeetingCreated': meetingId}));
                }catch(e){
                    console.error(e);
                }
            };
            createAndSaveMeeting();
            
        }
        else if (parsedMessage.answer) {
            //send the answer to the meeting creator
            const meetingId = Number(parsedMessage.answer.meetingId);
            const attendeId = parsedMessage.answer.attendeId;
            const answer = parsedMessage.answer.SDPanswer;

            // get the connection of host
            const currentMeeting = getMeetingById(meetingId);
            if(currentMeeting){
                currentMeeting[meetingId].host.send(JSON.stringify({ "answer": answer }));
            }

            // don't need to save SDP
            const saveAnswer = async () => {
                try{
                    const meeting = await getMeetingWithMeetingAndAttendeId(meetingId, attendeId);
                    if(meeting){
                        meeting.answer = answer;
                        await db().collection(collectionName).updateOne({meetingId, attendeId}, {$set: meeting});
                        
                        
                    }
                }catch(error){
                    console.log("Error sending answer..", error);
                }   
            };
            saveAnswer();
            
        }
        else if (parsedMessage.join) {
            // an attendee notify server that he wants to join the meeting after auth
            // save its web socket connection in meeting object
            const meetingId = Number(parsedMessage.join.meetingId);
            const attendeId = parsedMessage.join.attendeId;
            const checkMeeting = async () => {
                try{
                    console.log("meeting and attende Id", meetingId, attendeId);
                    const meeting = await getMeetingWithMeetingAndAttendeId(meetingId, attendeId);
                    if(meeting){
                        meeting.attende = ws;
                        await db().collection(collectionName).updateOne({meetingId, attendeId}, {$set: meeting});

                       // set the connection of attende
                       const currentMeeting = getMeetingById(meetingId);
                       if(currentMeeting){
                           currentMeeting[meetingId].attende = ws;
                       }
                        ws.send(JSON.stringify({ "offer": meeting.offer }));
                    }else{
                        console.log("meeting not found");
                    }
                }catch(error){
                    console.log("Error querying meeting", error);
                }
            };
            checkMeeting();   
        }
        else if (parsedMessage.iceCandidate) {
            //send candidate to all ws connection except the sender itself
            const wsconn = [];
            const meetingId = Number(parsedMessage.iceCandidate.meetingId);
            const iceCandidate = parsedMessage.iceCandidate.candidate;
            
            
            const currentMeeting = getMeetingById(meetingId);
            if(currentMeeting){
                wsconn.push(currentMeeting[meetingId].host, currentMeeting[meetingId].attende);

                wsconn.forEach(conn => {
                    if(conn != ws && conn != undefined){
                        conn.send(JSON.stringify({ "iceCandidate": iceCandidate }));
                    }
                })
            }
            
        }
        else if (parsedMessage.peerConnection) {
            let count = 2;
            const meetingId = parsedMessage.peerConnection;
            const wsconn = [];
            const currentMeeting = getMeetingById(meetingId);
            if(currentMeeting){
                wsconn.push(currentMeeting[meetingId].host);
                wsconn.push(currentMeeting[meetingId].attende);
            }
            //send to everyone
            wsconn.forEach(conn => {
                conn.send(JSON.stringify({ "totalAttende": count }));
            });
        }
    });


    ws.on('close', () => {
        console.log("connection closed");
    })
});


async function startServer() {
    try {
        await initDb();
        console.log("start server after init db....");
        server.listen(3000);
    } catch {
        console.error("Error starting server..");
        process.exit(1);
    }
}


async function saveToDb(meeting){
    try{
        await db().collection(collectionName).insertOne(meeting);
        console.log("saved successfully to db");
    }catch(error){
        console.error(error);
    }
}

async function generateMeetingId(){
    let newMeetingId = Math.floor(100000000 + Math.random()* 900000000);
    while(true){
        try{
            const meeting = await db().collection(collectionName).findOne({meetingId: newMeetingId});
            if(meeting){
                newMeetingId = Math.floor(100000000 + Math.random()* 900000000);
            }else{
                break;
            }
        }catch(e){
            console.error(e);
        }
    }
    console.log("meetingId new..", newMeetingId);
    console.log("Type", typeof newMeetingId);
    return newMeetingId;
    
}

function generatePasscode(){
    return Math.floor(1000000 + Math.random()*9000000);
}

async function getMeetingWithMeetingAndAttendeId(meetingId, attendeId) {
    try {
        const meeting = await db().collection(collectionName).findOne({ meetingId, attendeId });
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

async function getMeetingWithMeetingId(meetingId) {
    try {
        const meeting = await db().collection(collectionName).findOne({ meetingId});
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

function getMeetingById(meetingId){
    return activeMeetings.find( meetingObj => meetingObj[meetingId]);
}