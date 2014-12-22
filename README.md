bearded-wight
=============

A small music player realised with the Sound web api. It can be use locally (no server) or with a server.


The player is only working with the following player:
* Firefox (Version tested 34.0.5)
* Safari (Version 7.0.5)

To use the player, you will need to load a file in json format ( currently there is already a file loaded ). The json file need to respect the following syntax.

  {
    "1": {
        "url": "music/Motorama - Alps.mp3",   // Url to the music file
        "name": "Alps",                       // Name of the music
        "icon": "img/motorama.jpg",           // Icon for the music
        "artist_name": "Motorama",            // Name of the artist
    }, 
    ...
  }

You do not need to have a webserver. You can just open the file in any of the browser mentionned above.
