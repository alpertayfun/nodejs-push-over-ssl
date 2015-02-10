var app = require('express')();
var https = require('https');
var fs = require('fs');


var sslOptions = {
  key: fs.readFileSync('server.key'), //set ssl key file
  cert: fs.readFileSync('server.crt'), //set ssl cert file
  ca: fs.readFileSync('server.csr'), //set ssl ca bundle file
  requestCert: true,
  rejectUnauthorized: false
};

var server = https.createServer(sslOptions,app).listen('1313', function(){
  console.log("Secure Express server listening on port 1313");
});

var mysql = require('mysql')
// Let’s make node/socketio listen on port 1313
var io = require('socket.io').listen(server);

var handshake_query_user_id = null;

io.use(function (socket, next) {
  var handshake = socket.handshake;
  handshake_query = handshake.query.user;
  console.log(handshake.query.user);
  next();
});

// Define our db creds
var db = mysql.createConnection({
    host     : 'localhost',
    user     : 'username',
    password : 'password',
    database : 'db',
    port        : 3306
});
 
// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err)
})
 
// Define/initialize our global vars
var notes = [],
    isInitNotes = false,
    socketCount = 0,
    connectionsArray = [],
    POLLING_INTERVAL = 1000,
    pollingTimer;

var pollingLoop = function () {
    
        var query = db.query('SELECT * FROM TABLE'), //set our query
        users = []; 

    // set up the query listeners
    query
    .on('error', function(err) {
        // Handle error, and 'end' event will be emitted after this as well
        //console.log( err );
        updateSockets( err );
        
    })
    .on('result', function( user ) {
        // it fills our array looping on each user row inside the db
	// console.log(user);        
         users.push( user );
    })
    .on('end',function(){
        // loop on itself only if there are sockets still connected
        if(connectionsArray.length) {
            pollingTimer = setTimeout( pollingLoop, POLLING_INTERVAL );

            updateSockets({users:users}); //emit all table datas to connected users
        }
    });

};

// create a new websocket connection to keep the content updated without any AJAX request
io.sockets.on( 'connection', function ( socket ) {
    
    console.log('Number of connections:' + connectionsArray.length);
    // start the polling loop only if at least there is one user connected
    if (!connectionsArray.length) {
        pollingLoop();
    }
    
    socket.on('disconnect', function () {
        var socketIndex = connectionsArray.indexOf( socket );
        console.log('socket = ' + socketIndex + ' disconnected');
        if (socketIndex >= 0) {
            connectionsArray.splice( socketIndex, 1 );
        }
    });

    console.log( 'A new socket is connected!' );
    connectionsArray.push( socket );
    
});

var updateSockets = function ( data ) {
    // store the time of the latest update
    data.time = new Date();
    data.connections = connectionsArray.length;    
    // send new data to all the sockets connected
    connectionsArray.forEach(function( tmpSocket ){
        tmpSocket.volatile.emit( 'notification' , data ); //emit notification
    });
};
