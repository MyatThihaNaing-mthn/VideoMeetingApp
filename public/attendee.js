//host view
const hostVideo = document.querySelector("video#video-host-view");
const selfView = document.querySelector('video#video-attende-view');
// video 
const constraints = {
    'video' : true,
    'audio' : true
};


//socket connection
const socket = new WebSocket('ws://localhost:3000');
const config = {'iceServers': [{
    urls: ["turn:turn.anyfirewall.com:443?transport=tcp"],
    credential: "webrtc",
    username: "webrtc"
},
{
    urls: ["turn:192.158.29.39:3478?transport=tcp"],
    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
    username: "28224511:1379330808"
},
{
    urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
    ]
}]};

const peerConnection = new RTCPeerConnection(config);

// peerConnection.addTransceiver('audio');
// peerConnection.addTransceiver('video');


peerConnection.addEventListener('track', async (track) => {
    const [remoteStream] = track.streams;
    hostVideo.srcObject = remoteStream;
    console.log("adding stream to ", hostVideo);
});




// send candidate to the signal server
peerConnection.addEventListener('icecandidate', event => {
    if(event.candidate){
        //send ice candidate to the websocket server
        console.log("new Candidate found...");
        socket.send(JSON.stringify({'iceCandidate': {'candidate': event.candidate, 'meetingId': getMeetingId()}}));
    }
});

// p2p conn established
peerConnection.addEventListener('connectionstatechange', event => {
    if (peerConnection.connectionState === 'connected') {
        // Peers connected!
        console.log("p2p connected..");

        //after p2p connection, send a message to signal server to change the number of attendes
        socket.send(JSON.stringify({"peerConnection": getMeetingId()}));
    }
});

peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log('ICE Gathering State:', peerConnection.iceGatheringState);
});




//connection opened
socket.addEventListener('open', () => {
    console.log("socket connection opened");
    console.log(getAttendeId());
    socket.send(JSON.stringify({'join': {'attendeId' : getAttendeId(), 'meetingId': getMeetingId()}}));
});

//listen message from server
socket.addEventListener('message', async (message)=> {

    const parsedMessage = JSON.parse(message.data);
    //check the message is an OFFER or an ANSWER
    if(parsedMessage.answer){
        const remoteDesc = new RTCSessionDescription(parsedMessage.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
        console.log("received answer..")
    }
    else if(parsedMessage.offer){
        //adding track before accepting offer
        navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            console.log("Got mediastream", stream);
            selfView.srcObject = stream;
            selfView.addEventListener('loadedmetadata', () => {
                // Flip the video horizontally
                selfView.style.transform = 'scaleX(-1)';
            });

            //add tracks to peer connection
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
                console.log("adding tracks");
            });
        }).then(()=> {
            peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.offer));
            console.log("received offer..");
            
            peerConnection.createAnswer({offerToReceiveAudio: true,
                                        offerToReceiveVideo: true})
                                        .then(answer => {
                peerConnection.setLocalDescription(answer);
                socket.send(JSON.stringify({"answer": {"SDPanswer": answer, "meetingId": getMeetingId(), "attendeId": getAttendeId()}}));
            }).catch(error => {
                console.log(error);
            });
        })
        .catch(error => {
            console.log("Error accessing media devices", error);
        });
        

    }else if(parsedMessage.iceCandidate){
        //add incoming ice candidate to the peer connection
        console.log("new Candidate came...");
        try{
            await peerConnection.addIceCandidate(parsedMessage.iceCandidate);
        }catch(e){
            console.error(e);
        }
    }
    else if(parsedMessage.totalAttende){
        //received count and change video grid
        console.log("Total attendee :", parsedMessage.totalAttende);
    }
});

//connection closed
socket.addEventListener('close', () => {
    console.log("connection closed");
});




function prePareSelfView(){
    const selfView = document.querySelector('video#attende-video');

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            console.log("Got mediastream", stream);
            selfView.srcObject = stream;
            selfView.addEventListener('loadedmetadata', () => {
                // Flip the video horizontally
                selfView.style.transform = 'scaleX(-1)';
            });

            //add tracks to peer connection
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
                console.log("adding tracks");
            });
        })
        .catch(error => {
            console.log("Error accessing media devices", error);
        });
}

function getAttendeId(){
    const attendeIdInput = document.getElementById("attendeId");
    console.log(attendeIdInput);
    if(attendeIdInput){
        return attendeIdInput.value;
    }else{
        return -1;
    }   
}

function getMeetingId(){
    const meetingIdInput = document.getElementById("meetingId");
    console.log("meetingID from attedejs ", meetingIdInput);
    if(meetingIdInput){
        return meetingIdInput.value;
    }else{
        return -1;
    }
}