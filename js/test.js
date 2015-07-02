
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


var playerBear = {
	"init": function(option){	
		try {
			// still needed for Safari
			window.AudioContext = window.AudioContext || window.webkitAudioContext;

			// create an AudioContext
			playerBear.context = new AudioContext();
		} catch(e) {
			// API not supported
			throw new Error('Web Audio API not supported.');
		}
		playerBear.isPlaying = false;
		playerBear.canvasName = option['canvas'];
		playerBear.playlistId = option['playlistId']
		playerBear.startedAt = 0;
		playerBear.pausedAt = 0;
		playerBear.timer = 0;
		playerBear.duration = 0;
		playerBear.gainNode = 0;
		playerBear.ctx = 0;
		playerBear.analyser = 0;
		playerBear.javascriptNode = 0;
		playerBear.gradient = 0;
		playerBear.source = 0;
		playerBear.current = null;
		playerBear.playlist = {};
		playerBear.setupAudioNodes();
		
		playerBear.initGradient();
		
		playerBear.javascriptNode.onaudioprocess = function() {

			// get the average for the first channel
			var array =  new Uint8Array(playerBear.analyser.frequencyBinCount);
			playerBear.analyser.getByteFrequencyData(array);

			// clear the current state
			playerBear.ctx.clearRect(0, 0, 1000, 325);

			// set the fill style
			playerBear.ctx.fillStyle = playerBear.gradient;
			playerBear.drawSpectrum(array);

		};
		
		playerBear.initSource();
		$('#volume-back-bar').click(playerBear.changeVolumeBar);
		$('#seek-bar').click(playerBear.changeProgressBar);
		setInterval(playerBear.updateTimer, 1000);
		setInterval(playerBear.updateProgressBar, 1000);
	},
	
	"initGradient": function(){
		// get the context from the canvas to draw on
		playerBear.ctx = $("#canvas").get()[0].getContext("2d");

		// create a gradient for the fill. Note the strange
		// offset, since the gradient is calculated based on
		// the canvas, not the specific element we draw
		playerBear.gradient = playerBear.ctx.createLinearGradient(0,0,0,300);
		playerBear.gradient.addColorStop(1,'#000000');
		playerBear.gradient.addColorStop(0.75,'#0000ff');
		playerBear.gradient.addColorStop(0.25,'#00ffff');
		playerBear.gradient.addColorStop(0,'#ffffff');
	},
	
	"setupAudioNodes": function(){
		playerBear.javascriptNode = playerBear.context.createScriptProcessor(2048, 1, 1);
		// connect to destination, else it isn't called
		playerBear.javascriptNode.connect(playerBear.context.destination);
		playerBear.gainNode = playerBear.context.createGain();

		// setup a analyzer
		playerBear.analyser = playerBear.context.createAnalyser();
		playerBear.analyser.smoothingTimeConstant = 0.3;
		playerBear.analyser.fftSize = 512;
	},
	
	"initSource": function(){
		playerBear.source = playerBear.context.createBufferSource();
		playerBear.source.connect(playerBear.analyser);
		playerBear.analyser.connect(playerBear.javascriptNode);
		
		playerBear.source.connect(playerBear.gainNode);
		
		playerBear.gainNode.connect(playerBear.context.destination);
	},
	
	"drawSpectrum": function(array){
	    for ( var i = 0; i < (array.length); i++ ){
			var value = array[i];

			playerBear.ctx.fillRect(i*5,325-value,3,325);
		}
	},
	
	"createPlaylist": function(playlistC){
		for(var k in playlistC){
			playerBear.addItemToHtmlPlaylist(playlistC[k]);
		}
	},
	
	"addItemToHtmlPlaylist": function(obj){
	    item = getMaxOfArray(Object.keys(playerBear.playlist)) + 1;
		playerBear.playlist[item] = obj;
		var li = "<li class='list_item' id='item" + item + "'>\n\
					<div class='list_item_icon'>\n\
					<img src='" + playerBear.playlist[item].icon + "' />\n\
					</div>\n\
					<div class='list_item_info'>\n\
						<p class='list_item_info_song_name'  onclick=\"playerBear.changePlaylist('"+item+"') \">"+playerBear.playlist[item].name+"</p>\n\
						 <p class='list_item_info_artist_name'>"+ playerBear.playlist[item].artist_name+"</p>\n\
					 </div>\n\
					 <div class='playlist_item_icon'>\n\
						<p class='icon-player-small trash' onclick=\"playerBear.deleteItemFromPlaylist('"+item+"')\"></p>  \n\
					</div>\n\
					</li>"
		$('#'+playerBear.playlistId).append(li);
	},
	
	"deleteItemFromPlaylist": function(item){
	    if(item == playerBear.current){
			playerBear.next();
		}
			$('#item'+item).remove();
		delete playerBear.playlist[item];
	},
	
	"changePlaylist": function(item){
	    playerBear.changeDisplay(item);
		if(playerBear.isPlaying){
			playerBear.stopSound();
		}
		playerBear.current = item;
		playerBear.loadSound(playerBear.current);
	},
	"loadSound" : function(obj) {
		playerBear.current = obj;
		var request = new XMLHttpRequest();
		request.open('GET', playerBear.playlist[obj].url, true);
		request.responseType = 'arraybuffer';

		request.onload = function() {
		// request.response is encoded... so decode it now
		playerBear.context.decodeAudioData(request.response, function(buffer) {
			playerBear.playlist[obj].buffer = buffer;
			playerBear.loadBarTime();
			playerBear.playSound();    
		}, 
		function(e){"Error with decoding audio data" }
		);
		}

		request.send();
	
	},
	"playSound": function(){
		playerBear.initSource();
		// Get the buffer
		playerBear.source.buffer = playerBear.playlist[playerBear.current].buffer;  
		// Connect Sound Source to Output 
		playerBear.source.connect(playerBear.context.destination); 
		playerBear.isPlaying = true;
		$('.play').attr("class", "pause icon-player");
		$("#player_info_name").html(playerBear.playlist[playerBear.current].name);
		$("#player_info_artist_name").html(playerBear.playlist[playerBear.current].artist_name);
		if (playerBear.pausedAt) {
			playerBear.startedAt = Date.now() - playerBear.pausedAt;
			playerBear.source.start(0, playerBear.pausedAt / 1000);
		}
		else {
			playerBear.startedAt = Date.now();
			playerBear.source.start(0);
		}
	},
	"pauseSound": function(){
	    playerBear.source.stop(0);
		playerBear.pausedAt = Date.now() - playerBear.startedAt;
		playerBear.isPlaying = false;
		$('.pause').attr("class", "play icon-player");
	},
	"stopSound": function(){
		playerBear.source.stop(0);
		playerBear.isPlaying = false;
		playerBear.pausedAt = null;
		$('.pause').attr("class", "play icon-player");
		$('#play-bar').attr('style', 'width:0%;');
	},
	"playButton": function(){
	    if(playerBear.current == null){
			playerBear.changePlaylist(Object.keys(playerBear.playlist)[0]);
		}
		if (!playerBear.isPlaying){
			playerBear.playSound();
		}
		else{
			playerBear.pauseSound();
		}
	},
	"changeVolume": function(percent){
		playerBear.gainNode.gain.value =percent/10;
		$('#volume-bar').attr('style', 'width:'+percent+'%;');
	
	},
	"changeVolumeBar": function(event){
		var positionOnImg = event.pageX - $('#volume-back-bar').offset().left;
		var percent = (positionOnImg / $('#volume-back-bar').width())*100;
		playerBear.changeVolume(percent);
	
	},
	"changeProgressBar": function(event){
		var positionOnImg = event.pageX - $('#seek-bar').offset().left;
		var percent = (positionOnImg / $('#seek-bar').width())*100;
		$('#play-bar').attr('style', 'width:'+percent+'%;');
		playerBear.source.stop(0);
		tmp = (positionOnImg / $('#seek-bar').width())*1000*playerBear.duration;
		playerBear.isPlaying = true;
		playerBear.initSource();
		playerBear.source.buffer = playerBear.playlist[playerBear.current].buffer; // Add Buffered Data to Object 
		playerBear.source.connect(playerBear.context.destination); // Connect Sound Source to Output 
		playerBear.startedAt = Date.now() - tmp;
		playerBear.source.start(0,  tmp/1000);
		playerBear.updateTimer();
	},
	"updateProgressBar": function(){
	    if(playerBear.isPlaying){
			var percent = (playerBear.timer * 100)/playerBear.duration;
			$('#play-bar').attr('style', 'width:'+playerBear.percent+'%;');
			if (percent >= 99.9999){
				playerBear.next();
			}
		}
	},
	"updateTimer": function(){
		if(playerBear.isPlaying){
			playerBear.timer = Math.floor( (Date.now() - playerBear.startedAt)/1000);
			$('#player-current-time').html(secondToMinStr(playerBear.timer));
		}
	},
	"changeDisplay": function(item){
	    $('#item'+playerBear.current).attr('class', 'list_item');
		$('#item'+item).attr('class', 'list_item current');
	},
	"loadBarTime": function(){
		playerBear.duration = playerBear.playlist[playerBear.current].buffer.duration;
		$("#player-duration").html(secondToMinStr(playerBear.duration));
	},
	"next": function(){
		if(playerBear.current !=  Object.keys(playerBear.playlist)[Object.keys(playerBear.playlist).length - 1]){
			var c = Object.keys(playerBear.playlist)[Object.keys(playerBear.playlist).indexOf(playerBear.current) +1]
			playerBear.changeDisplay(c);
			playerBear.current = c;
			playerBear.changePlaylist(playerBear.current);
		} else{
			playerBear.stopSound();
		}
	},
	"back": function(){
		if(playerBear.current != Object.keys(playerBear.playlist)[0]){
			var c = Object.keys(playerBear.playlist)[Object.keys(playerBear.playlist).indexOf(playerBear.current) -1]
			playerBear.changeDisplay(c);
			playerBear.current = c;
			playerBear.changePlaylist(playerBear.current);
		}else{
			playerBear.stopSound();
		}
	}
	
};
