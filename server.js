const http = require('http');
const express = require('express');
const homeRoute = require('./routes/home');
const meetingRoute = require('./routes/meeting')
const path = require('path');
const { WebSocket } = require('ws');
const app = express();
const bodyParser = require('body-parser');
const { off } = require('process');


const server = http.createServer(app);
const wsServer = new WebSocket.Server({server: server});

// using object for a single meeting
const meeting = {};

//middlewares
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(meetingRoute);
app.use(homeRoute);



wsServer.on('connection', ws => {
    console.log("websocket connection established");

    //handle message
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if(parsedMessage.offer){
            const meetingId = "12345678";
            const passcode = "123456";
            //store infon in meeting object
            meeting.meetingId = meetingId;
            meeting.passcode = passcode;
            meeting.offer =  parsedMessage.offer;
            meeting.host = ws;
            meeting.noOfPerson = 0;
            
            console.log("Received Offer from client", parsedMessage.offer);
        }
        else if(parsedMessage.answer){
            //send the answer to the meeting creator
            meeting.answer = parsedMessage.answer;
            const hostWsConnection = meeting.host;
            console.log(parsedMessage.answer);
            hostWsConnection.send(JSON.stringify({"answer":parsedMessage.answer}));
            console.log("sending answer...");
        }
        else if(parsedMessage.join){
            // an attendee notify server that he wants to join the meeting after auth
            // save its web socket connection in meeting object
            meeting.attende = ws;
            ws.send(JSON.stringify({"offer": meeting.offer}));
        }
        else if(parsedMessage.iceCandidate){
            //send candidate to all ws connection except the sender itself
            const wsconn = [];
            wsconn.push(meeting.host, meeting.attende);
            console.log("no of conn", wsconn.length);
            console.log("attende", meeting.attende);
            console.log("host", meeting.host);
            wsconn.forEach(conn => {
                
                if(conn != ws && conn != undefined){
                    conn.send(JSON.stringify({"iceCandidate": parsedMessage.iceCandidate}));
                }
            });
        }
        else if(parsedMessage.peerConnection){
            let count = meeting.noOfPerson;
            count = count+1;
            meeting.noOfPerson = count;
            const wsconn = [];
            wsconn.push(meeting.host, meeting.attende);
            //send to everyone
            wsconn.forEach(conn => {
                conn.send(JSON.stringify({"totalAttende": count}));
            }); 
        }
    });


    ws.on('close', ()=> {
        console.log("connection closed");
    })
});


server.listen(3000);
