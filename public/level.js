
const AIM_POWER_SPEED = 0.1;
const SNOWBALL_COLLECT_TIME = 500;
const MAX_SNOWBALLS = 5;

var time;
var snowballCollectionStartTime;

var map;
var layer;

// map of the player names mapped to their position, 
// health and sprite.
// Does not include this client's player
// name -> {x, y, health, sprite}
var players = {};

// List of all the players' names
var playerNames = [];

var mainPlayerPosition;
var mainPlayerHealth;
var mainPlayerSprite;
var mainPlayerName;

var numSnowballs;
var formingSnowball;
var formingSnowballsText;
var snowballCollectionPercentage; // is between 0-1

var aiming;
var currentForce;
var currentAngle;
var aimCounter;
var aimSprite;
var powerBar;

var snowball;
var snowballs = [];
var thrownSnowballs = {};

/*
* name -> sprite
*/
var playerHealthBars = {};
var healthbar; //healthbar sprite

function initLevel() {
    aiming = false;
    currentForce = 0;
    aimCounter = 0;
    numSnowballs = 0;
    formingSnowball = false;
    snowballCollectionStartTime = 0;
    snowballCollectionPercentage = 0;
    initSnowballs();
    initHealthBars();
    initText();

    time = new Date().getTime();
    game.stage.backgroundColor = '#909090';
    
    map = game.add.tilemap('snowballMap');
    map.addTilesetImage('tileset', 'tileset');
    
    layer = map.createLayer('mapLayer');
    layer.resizeWorld();

    mainPlayerPosition = {x: 300, y: 300};
    mainPlayerHealth = 100;
    mainPlayerSprite = game.add.sprite(
        mainPlayerPosition.x,
        mainPlayerPosition.y,
        'snowman'
    );
    
    powerBar = game.add.sprite(5, 20, 'powerbar');

    for (var i in playerNames) {
        var name = playerNames[i];
        if (name != mainPlayerName) {
            sprite = game.add.sprite(0, 0, 'snowman');
            players[name] = {x: 0, y: 0, health: 0, sprite: sprite};
        }
        else {
            aimSprite = game.add.sprite(100, 100, 'arrow');
            aimSprite.anchor.setTo(0,0.5);
        }
    }
}

function requestMove(left) {
    if (!formingSnowball) {
        if (left) {
            sendKeystroke('left', true);
        } else {
            sendKeystroke('right', true);
        }
    }
}

function requestJump() {
    if (!formingSnowball) {
        sendJump();
    }
}

function randint(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

function playSound(sound) {
    var possibleSounds = sounds[sound];
    var soundFile = possibleSounds[randint(0, possibleSounds.length - 1)];
    soundFile.play();
}

function updatePlayerPosition(name, x, y) {
    if (name == mainPlayerName) {
        mainPlayerPosition.x = x;
        mainPlayerPosition.y = y;
        mainPlayerSprite.x = x;
        mainPlayerSprite.y = y;
        aimSprite.x = mainPlayerSprite.centerX; //+ mainPlayerSprite.width/2;
        aimSprite.y = mainPlayerSprite.centerY;
        aimSprite.angle = currentAngle * 180/Math.PI;
    } else {
        var p = players[name];
        p.x = x;
        p.y = y;
        p.sprite.x = x;
        p.sprite.y = y;
    }
}

function updateHealth(name, health) {
    players[name].health = health;
}

function initHealthBars() {
    for (var name in playerNames) {
        healthbar = game.add.sprite(100, 100, 'healthbar');
        playerHealthBars[playerNames[name]] = healthbar;
    }
}

function updateHealthBar () {
    for (var player in playerHealthBars) {
        console.log('name;', player, 'players[player];', players[player]);
        playerHealthBars[player].x = mainPlayerSprite.centerX - 13;
        playerHealthBars[player].y = mainPlayerSprite.centerY - 40;
        playerHealthBars[player].scale.x = players[player].health / 100;
    }
}

function updatePowerBar() {
    powerBar.scale.x = currentForce * 100;
    powerBar.tint = rgb2hex(255*currentForce, 50*(1 - currentForce) + 205, 0);
}

function rgb2hex(red, green, blue) {
    var rgb = blue | (green << 8) | (red << 16);
    return rgb;
}

function addPlayers(playerList) {
    playerNames = playerList;
}

function getAngle(x1, y1, x2, y2) {
    return Math.atan2((y2 - y1),(x2 - x1));
}

function getCurrentTime() {
    return (new Date()).getTime();
}

function initSnowballs() {
    for (var i = MAX_SNOWBALLS; i > 0; i--) {
        snowball = game.add.sprite(game.width - 15 * i - 40, 20, 'snowball');
        snowball.visible = false;
        snowballs.push(snowball);
    }
}

function displaySnowballs() {
    snowballs[numSnowballs-1].visible = true;
}

function decrementSnowballs() {
    snowballs[numSnowballs-1].visible = false;
    numSnowballs--;
}

function updateSnowball(id, x, y) {
    if (thrownSnowballs[id] !== undefined) {
        thrownSnowballs[id].x = x;
        thrownSnowballs[id].y = y;
    }
    else {
        var snowballSprite = game.add.sprite(x, y, 'snowball');
        thrownSnowballs[id] = snowballSprite;
    }
}

function deleteSnowball(id) {
    if (thrownSnowballs[id] !== undefined) {
        thrownSnowballs[id].destroy();
        delete thrownSnowballs[id];
    }
}

function updateFormingSnowballBar() {
    if (formingSnowball) {
        formingSnowballsText.text = "Building...\n\n" + 
            Math.floor(snowballCollectionPercentage*100) + "%";
    } else {
        formingSnowballsText.text = "";
    }
}

function handleSnowballForming() {
    if (isFormSnowballPressed() && numSnowballs < MAX_SNOWBALLS) {
        // start timer
        if (!formingSnowball) {
            snowballCollectionStartTime = getCurrentTime();
            snowballCollectionPercentage = 0;
            formingSnowball = true;
        }

        var timeDiff = 
            getCurrentTime() - snowballCollectionStartTime;

        if (timeDiff >= SNOWBALL_COLLECT_TIME && numSnowballs < MAX_SNOWBALLS) {
            // New ball is complete, stash it
            numSnowballs++;
            sendNewSnowball();
            formingSnowball = false;
            snowballCollectionPercentage = 0;
            displaySnowballs();
        } else {
            snowballCollectionPercentage = timeDiff / SNOWBALL_COLLECT_TIME;
        }

    } else {
        formingSnowball = false;
        snowballCollectionPercentage = 0;
    }
    updateFormingSnowballBar();
}

function initText() {
    var snowballsText = game.add.bitmapText(game.width - 130, 5, 'carrier_command', 'Snowballs', 10);
    game.add.bitmapText(5, 5, 'carrier_command', 'Power', 10);

    formingSnowballsText = game.add.bitmapText(
            snowballsText.x, snowballsText.y + 30,
            'carrier_command',
            '', 10);
}

function levelUpdate() {
    var newTime = getCurrentTime();
    var deltaTime = (newTime - time)/30;
    time = newTime;
    // updateHealthBar();
    
    if (isLeftMouseButtonPressed()) {
        aiming = true;
        currentForce = (-Math.cos(
                aimCounter*AIM_POWER_SPEED) + 1)/2;
        currentAngle = getAngle(mainPlayerPosition.x,
                    mainPlayerPosition.y, 
                    getMouseX(), getMouseY());
                    
        updatePowerBar();
        aimCounter++;
    } else {
        if (aiming) {
            if (numSnowballs > 0) {
                sendFire(currentAngle, currentForce);
                decrementSnowballs();
            }
        }
        currentForce = 0;
        aiming = false;
        aimCounter = 0;
    }
    handleSnowballForming();
}

