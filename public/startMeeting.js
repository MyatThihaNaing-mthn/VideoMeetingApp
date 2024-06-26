const constraints = {
    'video' : true,
    'audio' : true
};
let meeting = {
    meetingId: "",
    passcode: ""
}

const attendeVideo = document.querySelector("video#video-attende-view");
let remoteVideo;
//substitute attetnde video with remote video
function createRemoteVideo(){
    const remoteVideoElement = document.createElement('video');
    remoteVideoElement.setAttribute('autoplay', true);
    remoteVideoElement.setAttribute('playinline', true);
    remoteVideoElement.className = "video-view";
    remoteVideoElement.id = "remote-video-view"
    remoteVideo = remoteVideoElement;
    
}
createRemoteVideo();

function appendRemoteVideo(){
    const videoDiv = document.createElement('div');
    videoDiv.className = "video-grid-item";
    videoDiv.appendChild(remoteVideo);
    const mainGrid = document.querySelector("div#main");
    
    if(mainGrid){
        mainGrid.appendChild(videoDiv);
    }
}

function updateMeetingInfo(id, passcode){
    let meetingIdTxt = document.getElementById("meeting-id");
    let meetingPasscode = document.getElementById("meeting-passcode");
    meetingIdTxt.innerHTML = "Meeting ID: " +id;
    meetingPasscode.innerHTML = "Meeting Passcode "+passcode;
}


console.log("userId", getUserId());
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
peerConnection.addTransceiver('audio');
peerConnection.addTransceiver('video');


startMeeting();

peerConnection.addEventListener('icecandidate', event => {
    if(event.candidate){
        //send ice candidate to the websocket server
        console.log("new Candidate found...");
        socket.send(JSON.stringify({'iceCandidate': {'candidate': event.candidate, 'meetingId': meeting.meetingId}}));
    }
});




// p2p conn established
peerConnection.addEventListener('connectionstatechange', event => {
    if (peerConnection.connectionState === 'connected') {
        console.log("p2p connected..");
        appendRemoteVideo();
        //after p2p connection, send a message to signal server to change the number of attendes
        socket.send(JSON.stringify({"peerConnection":meeting.meetingId}));
    }
    if(peerConnection.connectionState === 'disconnected'){
        //handle p2p disconnection
        handleOnAttendeDisconnect();
    }

});

//add remote track to attende video view
peerConnection.addEventListener('track', async (track) => {
    console.log("track events");
    const [remoteStream] = track.streams;
    remoteVideo.srcObject = remoteStream;
    console.log("adding remote stream to ", remoteVideo);
});


peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log('ICE Gathering State:', peerConnection.iceGatheringState);
});




//connection opened
socket.addEventListener('open', () => {
    console.log("socket connection opened");
});

//listen message from server
socket.addEventListener('message', async (message)=> {
    const parsedMessage = JSON.parse(message.data);
    //check the message is an OFFER or an ANSWER
    if(parsedMessage.answer){
        const remoteDesc = new RTCSessionDescription(parsedMessage.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
        console.log("received answer..");
        console.log("connection " ,peerConnection.getStats);
        
    }
    else if(parsedMessage.offer){
        peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.offer));
        console.log("received offer..");
        const answer = peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({"answer": answer}));
    }
    else if(parsedMessage.iceCandidate){
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
    else if(parsedMessage.MeetingCreated){
        console.log("meeting Id: ", parsedMessage.MeetingCreated);
        let meeting = parsedMessage.MeetingCreated;

        meeting.meetingId = parsedMessage.MeetingCreated.meetingId;
        meeting.passcode = parsedMessage.MeetingCreated.passcode;
        updateMeetingInfo(meeting.meetingId, meeting.passcode);
    }
});


//connection closed
socket.addEventListener('close', () => {
    console.log("connection closed");
});



function startMeeting(){
    const selfView = document.querySelector('video#video-self-view');

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
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
            makeCall();
        })
        .catch(error => {
            console.log("Error accessing media devices", error);
        });
}

//make an offer
async function makeCall(){
    const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    });
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({'offer': {'offerSDP': offer, 'hostId': getUserId()}}));
}

function getUserId(){
    const userIdInput = document.getElementById("userId");
    console.log(userIdInput);
    if(userIdInput){
        return userIdInput.value;
    }else{
        return -1;
    }   
}


/**
 * To add click handlers
 */

document.addEventListener("DOMContentLoaded", (event) => {
    toggleMeetingInfoModal();
    handleEndCall();
});

function toggleMeetingInfoModal(){
    let btn = document.getElementById("meeting-info-btn");
    if(btn){
        btn.addEventListener("click", (event) => {
            let dialog = document.getElementById("meeting-modal");
            if(dialog.style.display === "none"){
                dialog.style.display = "block";
            }else{
                dialog.style.display = "none";
            }

        })
    }
}


function handleEndCall(){
    let endCallBtn = document.getElementById("end-call-btn");
    if(endCallBtn){
        endCallBtn.addEventListener("click", ()=> {
            //remove videos
            let videoElementArray = document.querySelectorAll(".video-view");
            videoElementArray.forEach(videoElement => {
                videoElement.parentNode.removeChild(videoElement);
            })
        });
    }
}

function handleOnAttendeDisconnect(){
   if(remoteVideo && remoteVideo.parentNode){
        let videoContainer = remoteVideo.parentNode;
        videoContainer.parentNode.removeChild(videoContainer);
   }
}