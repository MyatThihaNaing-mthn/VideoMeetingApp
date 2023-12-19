
const startMeetingBtn = document.getElementById("start-meeting");
const joinMeetingBtn = document.getElementById("join-meeting");

startMeetingBtn.addEventListener('click', () => {
    console.log("starting a meeting....");
    window.location.href = 'http://localhost:3000/meeting/start';
});

joinMeetingBtn.addEventListener('click', () => {
    console.log("Joining a meeting");
    window.location.href = 'http://localhost:3000/meeting/join';
});


