const http = require('http');
const express = require('express');
const homeRoute = require('./routes/home');
const meetingRoute = require('./routes/meeting')
const path = require('path');
const { WebSocket } = require('ws');
const app = express();

//middlewares
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(meetingRoute);
app.use(homeRoute);


const server = http.createServer(app);
const wsServer = new WebSocket.Server({server: server});


wsServer.on('connection', ws => {
    console.log("websocket connection established");

    //handle message
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if(parsedMessage.offer){
            console.log("Received Offer from client", parsedMessage.offer);
        }
        
    });

    //send message to the client
    ws.send("Welcome to WebSocket");

    ws.on('close', ()=> {
        console.log("connection closed");
    })
});


server.listen(3000);
