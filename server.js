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
const collectionName = "meetings";


const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server: server });

//connect to db before staring server
startServer();

// using object for a single meeting
const meeting = {};

app.set('view engine', 'ejs');

//middlewares
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
                    const meetingId = await generateMeetingId();
                    const passcode = generatePasscode();
                    console.log("passcode", passcode);
                    //store infon in meeting object
                    meeting.meetingId = meetingId;
                    meeting.passcode = passcode;
                    meeting.offer = parsedMessage.offer.offerSDP;
                    meeting.hostId = parsedMessage.offer.hostId;
                    meeting.host = ws;
                    meeting.attende = undefined; // initialize undefined
                    meeting.answer = undefined; // initialize undefined, not available yet

                    // save it to mongodb
                    saveToDb(meeting);
                }catch(e){
                    console.error(e);
                }
            };
            createAndSaveMeeting();
            

            console.log("Received Offer from client", parsedMessage.offer.offerSDP);
        }
        else if (parsedMessage.answer) {
            //send the answer to the meeting creator
            meeting.answer = parsedMessage.answer;
            const hostWsConnection = meeting.host;
            //console.log(parsedMessage.answer);
            hostWsConnection.send(JSON.stringify({ "answer": parsedMessage.answer }));
            console.log("sending answer...");
        }
        else if (parsedMessage.join) {
            // an attendee notify server that he wants to join the meeting after auth
            // save its web socket connection in meeting object
            meeting.attende = ws;
            ws.send(JSON.stringify({ "offer": meeting.offer }));
        }
        else if (parsedMessage.iceCandidate) {
            //send candidate to all ws connection except the sender itself
            const wsconn = [];
            wsconn.push(meeting.host, meeting.attende);
            /*
            console.log("no of conn", wsconn.length);
            console.log("attende", meeting.attende);
            clconsole.log("host", meeting.host);
            */
            wsconn.forEach(conn => {

                if (conn != ws && conn != undefined) {
                    conn.send(JSON.stringify({ "iceCandidate": parsedMessage.iceCandidate }));
                }
            });
        }
        else if (parsedMessage.peerConnection) {
            let count = meeting.noOfPerson;
            count = count + 1;
            meeting.noOfPerson = count;
            const wsconn = [];
            wsconn.push(meeting.host, meeting.attende);
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