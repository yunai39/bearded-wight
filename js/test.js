
var context;
var isPlaying = false;
var startedAt;
var pausedAt;
var timer;
var duration;
var gainNode;
var ctx;
var analyser;
var javascriptNode;
var gradient;
var source;
var playlist = {};
// array number in the playlist (Will need to have some kind of objects)
var current = null;
/* Create the contexte for the web audio player */
try {
  // still needed for Safari
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  // create an AudioContext
  context = new AudioContext();
} catch(e) {
  // API not supported
  throw new Error('Web Audio API not supported.');
}
setupAudioNodes();
initGradient();


/*          FUNCTION FOR THE BARCHART DISPLAY */
function initGradient(){
    // get the context from the canvas to draw on
    ctx = $("#canvas").get()[0].getContext("2d");

    // create a gradient for the fill. Note the strange
    // offset, since the gradient is calculated based on
    // the canvas, not the specific element we draw
    gradient = ctx.createLinearGradient(0,0,0,300);
    gradient.addColorStop(1,'#000000');
    gradient.addColorStop(0.75,'#0000ff');
    gradient.addColorStop(0.25,'#00ffff');
    gradient.addColorStop(0,'#ffffff');
}
    
function initSource(){
    source = context.createBufferSource();
    source.connect(analyser);
    analyser.connect(javascriptNode);
    
    source.connect(gainNode);
    
    gainNode.connect(context.destination);
    source.onended = function(){
        console.log('a');
    }

}

 
function setupAudioNodes() {

    // setup a javascript node
    javascriptNode = context.createScriptProcessor(2048, 1, 1);
    // connect to destination, else it isn't called
    javascriptNode.connect(context.destination);
    gainNode = context.createGain();

    // setup a analyzer
    analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 512;

} 

// when the javascript node is called
// we use information from the analyzer node
// to draw the volume
javascriptNode.onaudioprocess = function() {

    // get the average for the first channel
    var array =  new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);

    // clear the current state
    ctx.clearRect(0, 0, 1000, 325);

    // set the fill style
    ctx.fillStyle=gradient;
    drawSpectrum(array);

}


function drawSpectrum(array) {
    for ( var i = 0; i < (array.length); i++ ){
        var value = array[i];

        ctx.fillRect(i*5,325-value,3,325);
        //  console.log([i,value])
    }
};




/*
 * This function will create the html playlist from the playlist
 * 
 * @param {array} playlistC
 * @name createPlaylist
 */
function createPlaylist(playlistC){
    for(var k in playlistC){
        addItemToHtmlPlaylist(playlistC[k]);
    }
}


/*
 * This function will create the html display in theplaylist for the song
 * 
 * @param {array} obj
 * @name addItemToHtmlPlaylist
 */
function addItemToHtmlPlaylist(obj){
    item = getMaxOfArray(Object.keys(playlist)) + 1;
    playlist[item] = obj;
    var li = "<li class='list_item' id='item" + item + "'>\n\
                <div class='list_item_icon'>\n\
                <img src='" + playlist[item].icon + "' />\n\
                </div>\n\
                <div class='list_item_info'>\n\
                    <p class='list_item_info_song_name'  onclick=\"changePlaylist('"+item+"') \">"+playlist[item].name+"</p>\n\
                     <p class='list_item_info_artist_name'>"+ playlist[item].artist_name+"</p>\n\
                 </div>\n\
                 <div class='playlist_item_icon'>\n\
                    <p class='icon-player-small trash' onclick=\"deleteItemFromPlaylist('"+item+"')\"></p>  \n\
                </div>\n\
                </li>"
    $('#player_playlist_list').append(li);
}

/*
 * This function will delete and item from the playlist
 * 
 * @param {string} item
 * @name deleteItemFromPlaylist
 */
function deleteItemFromPlaylist(item){
    if(item == current){
        next();
    }
    $('#item'+item).remove();
    delete playlist[item];
    
}


/*
 * This function will set the current song to the song pass in arg
 * 
 * @param {string} item
 * @name changePlaylist
 */
function changePlaylist(item){
    changeDisplay(item);
    if(isPlaying){
        stopSound();
    }
    current = item;
    loadSound(current);
}





/*
 * This function will set the current song to be the following song to the current song in the playlist
 * 
 * @name next
 */
function next(){
    
    if(current !=  Object.keys(playlist)[Object.keys(playlist).length - 1]){
        var c = Object.keys(playlist)[Object.keys(playlist).indexOf(current) +1]
        changeDisplay(c);
        current = c;
        changePlaylist(current);
    } else{
        stopSound();
    }
}

/*
 * This function will set the current song to be the previous song to the current song in the playlist
 * 
 * @name back
 */
function back(){
    
    if(current != Object.keys(playlist)[0]){
        var c = Object.keys(playlist)[Object.keys(playlist).indexOf(current) -1]
        changeDisplay(c);
        current = c;
        changePlaylist(current);
    }else{
        stopSound();
    }
}




/*
 * This function will load a buffer for the song to be played
 * 
 * To generate the buffer, you will need to fetch the mp3 file as an array buffer
 * The file will need to be an mp3> It can ever be a direct link to the file, or 
 * a call to a php function sending the file as a response
 * 
 * @param {str} obj     name of the object int the playlist
 * @name loadSound
 */
function loadSound(obj) {
  current = obj;
  var request = new XMLHttpRequest();
  request.open('GET', playlist[obj].url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    // request.response is encoded... so decode it now
    context.decodeAudioData(request.response, function(buffer) {
      playlist[obj].buffer = buffer;
      loadBarTime();
      playSound();    
    }, 
    function(e){"Error with decoding audio data" }
    );
  }

  request.send();
}




/*
 * This is the function to play the sound
 * 
 * This function will have two behaviour. If the sound was paused,
 * it will begin the sound at the right place. Otherwise, it will
 * start the music at the beginning.
 * 
 * @name playSound
 */
function playSound() {
    initSource();
    // Get the buffer
    source.buffer = playlist[current].buffer;  
    // Connect Sound Source to Output 
    source.connect(context.destination); 
    isPlaying = true;
    $('.play').attr("class", "pause icon-player");
    $("#player_info_name").html(playlist[current].name);
    $("#player_info_artist_name").html(playlist[current].artist_name);
    if (pausedAt) {
        startedAt = Date.now() - pausedAt;
        source.start(0, pausedAt / 1000);
    }
    else {
        startedAt = Date.now();
        source.start(0);
    }
    
};


/*
 * This function will pause the music
 * 
 * To pause the music, we will need to stop the sound, and set 
 * pausedAt. isPlaying is also important to set wherever the music
 * is playing or not. Finally we need to update the play button to 
 * pause button.
 * 
 * @name pauseSound
 */
function pauseSound() {
    source.stop(0);
    pausedAt = Date.now() - startedAt;
    isPlaying = false;
    $('.pause').attr("class", "play icon-player");
};

/*
 * This function will trigger the playSound or PauseSound depending 
 * if the music is currently playing
 * 
 * @name playButton
 */
function playButton() {
    if(current == null){
        changePlaylist(Object.keys(playlist)[0]);
    }
    if (!isPlaying){
        playSound();
    }
    else{
        pauseSound();
    }
};


/**
 * this function will stop the sound
 * 
 * It will stop the sound, handle pause/play button. the timer and so on
 * 
 * @name stopSound
 */
function stopSound(){
    source.stop(0);
    isPlaying = false;
    pausedAt = null;
    $('.pause').attr("class", "play icon-player");
    $('#play-bar').attr('style', 'width:0%;');
    
}


$('#volume-back-bar').click(changeVolumeBar);
$('#seek-bar').click(changeProgressBar);
setInterval(updateTimer, 1000);
setInterval(updateProgressBar, 1000);



/* useful function */
/**
 * this function will get  the maximum value of an array
 * 
 * @name getMaxOfArray
 * @param {array} numArray
 * @returns {int}
 */
function getMaxOfArray(numArray) {
    if(numArray.length > 0)
        return Math.max.apply(null, numArray);
    else
        return 0;
}


/**
 * this function will generate str representing mm:ss from a number of second
 * 
 * @name secondToMinStr
 * @param {int} input
 * @returns {str}
 */
function secondToMinStr(input){
    var min = Math.floor(input/60);
    var sec = Math.floor(input - min*60);
    if (sec < 10){
        sec = "0" + sec;
    }
    if( min < 10 ){
        min = "0" + min;
    }
    return min+":"+sec;
}


/**
 * this function will xhange the music level (from -1 to 10)
 * 
 * 
 * @name changeVolume
 * @param {int} percent
 * @returns {none}
 */
function changeVolume(percent){
    console.log(gainNode.gain.value );
    gainNode.gain.value =percent/10;
    $('#volume-bar').attr('style', 'width:'+percent+'%;');
}

/* Display Methods */



/**
 * this function will handle the volumeBar
 * 
 * 
 * @name changeVolumeBar
 * @param {type} event
 * @returns {none}
 */
function changeVolumeBar(event){
    var positionOnImg = event.pageX - $('#volume-back-bar').position().left;
    var percent = (positionOnImg / $('#volume-back-bar').width())*100;
    changeVolume(percent);
}


/**
 * this function will handle the progressBar
 * 
 * When a user want to go forward or backward in a song, he will be able to use the progress bar.
 * Therefore, we will need to do a few things
 *  - update the progress bar according to where the user clicked
 *  - moving the song toward the point where the user want to listen
 * 
 * @name changeProgressBar
 * @param {type} event
 * @returns {none}
 */
function changeProgressBar(event){
    var positionOnImg = event.pageX - $('#seek-bar').position().left;
    var percent = (positionOnImg / $('#seek-bar').width())*100;
    $('#play-bar').attr('style', 'width:'+percent+'%;');
    source.stop(0);
    tmp = (positionOnImg / $('#seek-bar').width())*1000*duration;
    isPlaying = true;
    initSource();
    source.buffer = playlist[current].buffer; // Add Buffered Data to Object 
    source.connect(context.destination); // Connect Sound Source to Output 
    startedAt = Date.now() - tmp;
    source.start(0,  tmp/1000);
    updateTimer();
}


/**
 * this function will update the progressBar
 * 
 * While the music is playing the progress bar need to be updated
 * 
 * @name updateProgressBar
 * @returns {none}
 */
function updateProgressBar(){
    if(isPlaying){
        var percent = (timer * 100)/duration;
        $('#play-bar').attr('style', 'width:'+percent+'%;');
        if (percent >= 99.9999){
            next();
        }
    }
}


/**
 * this function will timer 
 * 
 * While the music is playing the timer need to be updated
 * 
 * @name updateTimer
 * @returns {none}
 */
function updateTimer(){
    console.log(isPlaying);
    if(isPlaying){
        timer = Math.floor( (Date.now() - startedAt)/1000);
        $('#player-current-time').html(secondToMinStr(timer));
    }
}

/*
 * This function will change the display of the playlist
 * 
 * This function will set the class of the song div selected in 
 * the playlist to current. It will also change the current div 
 * of the song to list_item.
 * 
 * @param {string} item
 * @name changeDisplay
 */
function changeDisplay(item){
    $('#item'+current).attr('class', 'list_item');
    $('#item'+item).attr('class', 'list_item current');
}


/*
 * This function will update the barTime and the var
 * 
 * @name loadBarTime
 */
function loadBarTime(){
    duration = playlist[current].buffer.duration;
    $("#player-duration").html(secondToMinStr(duration));
}


/* File Reader for playlist */

var reader;
function handleFileSelect(evt) {
  if (window.File && window.FileReader && window.FileList && window.Blob) {

  } else {
      alert('The File APIs are not fully supported in this browser.');
      return;
  }   
  var files = evt.target.files; // FileList object

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {
    reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = receivedText;
    reader.readAsText(files[i]);

  }
}

  function receivedText() {   
     createPlaylist(JSON.parse(reader.result));
  }   
document.getElementById('input_json_file').addEventListener('change', handleFileSelect, false);
$.getJSON("playlist.json", function(json) {
     createPlaylist(json);
});



changeVolume(10);