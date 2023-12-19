const constraints = {
    'video' : true,
    'audio' : true
};


const selfView = document.querySelector('video#video-self-view');
console.log(selfView);

navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        console.log("Got mediastream", stream);
        selfView.srcObject = stream;
        selfView.addEventListener('loadedmetadata', () => {
            // Flip the video horizontally
            selfView.style.transform = 'scaleX(-1)';
        });
    })
    .catch(error => {
        console.log("Error accessing media devices", error);
    });

//make an offer
async function makeCall(){
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({'offer': offer}));
}

makeCall();