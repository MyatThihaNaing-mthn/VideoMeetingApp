//socket connection
const socket = new WebSocket('ws://localhost:3000');
const config = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

const peerConnection = new RTCPeerConnection(config);

//connection opened
socket.addEventListener('open', () => {
    console.log("socket connection opened");
});

//listen message from server
socket.addEventListener('message', async (message)=> {
    console.log("Message from server", message.data);
    //check the message is an OFFER or an ANSWER
    if(message.answer){
        const remoteDesc = new RTCSessionDescription(message.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
    }
});

//connection closed
socket.addEventListener('close', () => {
    console.log("connection closed");
});


//send a message to the server

function sendMessageToSocketServer(message){
    if(socket.readyState === WebSocket.OPEN){
        socket.send(message);
    }else{
        console.log("Error sending the message");
    }
}