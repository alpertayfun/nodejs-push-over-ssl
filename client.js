$(document).ready(function(){
    var socket = io.connect('https://www.domain.com:1313/', { query: "user="+usr },{secure: true}); //set our domain or server ip and port

    socket.on('notification', function (data) {
    	console.log(data); //lets get the data.
    });
});