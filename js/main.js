const WIDTH = 800;
const HEIGHT = 600;
// const NUM_ROWS = HEIGHT / 20;
// const NUM_COLS = WIDTH / 20;
const INIT_LIVE_CELL_THROTTLE = 15;
const CELL_WIDTH = 20;
const CELL_HEIGHT = 20;
const GENERATION_LIFETIME = 1000;

/**
 * Phaser must be configured much like our phones have settings or configuration OR like a computer game has settings/config
 * Below, 'config' is a variable that points to or refers to an object that holds all the configuration information.
 * The object starts with '{' and ends with '}'
 */
let config = {
    type: Phaser.CANVAS,
    parent: 'game-canvas',
    /* specifies the 'type' of rendering engine / how graphics will be drawn */
    width: WIDTH,
    /* specifies the width of the game in pixels */
    height: HEIGHT,
    /* specifies the height of the game in pixels */
    scene: {
        /* 'scene' is an object within an object */
        preload: preload,
        /* preload is a function that runs ONCE only and is used to load game assets */
        create: create,
        /* create is a function that  ONCE only and is used to create game objects/things/characters */
        update: update /* update is a function that runs over and over again and is used to update positions of game characters */
    }
};

/* Create a new Phaser object */
let game = new Phaser.Game(config);
game.num_rows = 30;
game.num_cols = 40;
game.xOffset = 1;
game.yOffset = 1;
game.generation = 0;
game.startGame = false;
game.manualUpdate = false;

let grid = []
let timedEvent

const cellStates = {
    NONE: 0,
    ALIVE: 1,
    DEAD: 2
}

/**
 * The preload() function is where all game assets are loaded into Chrome's memory so that they can be
 * accessed very quickly by the game code. It is a good way of organising our game.
 */
function preload() {
    /* Load assets from the assets/images directory to make loading images easier - see below */
    this.load.setBaseURL('./assets/images/');

    this.load.image('grid', 'grid.png');
    this.load.image('cell', 'cell.png');

    game.self = this;

    document.querySelector('input[id="manual-update"]').addEventListener('click', e => {
        game.manualUpdate = !game.manualUpdate;
    });

    document.querySelector('button[id="start"]').addEventListener('click', e => {
        game.startGame = true;
        // Create the timer which designates the length of a generation
        timedEvent = this.time.addEvent({ delay: GENERATION_LIFETIME, callback: onTimerEvent, callbackScope: this, loop: true })
    })

    document.querySelector('input[id="grid-width"]').addEventListener('change', e => {
        game.changeWidth(e);
    })
    document.querySelector('input[id="grid-width"]').addEventListener('keyup', e => {
        game.changeWidth(e);
    })
    document.querySelector('input[id="grid-width"]').addEventListener('input', e => {
        game.changeWidth(e);
    })
    document.querySelector('input[id="grid-width"]').addEventListener('paste', e => {
        game.changeWidth(e);
    })
    document.querySelector('input[id="grid-height"]').addEventListener('change', e => {
        game.changeHeight(e);
    })
    document.querySelector('input[id="grid-height"]').addEventListener('keyup', e => {
        game.changeHeight(e);
    })
    document.querySelector('input[id="grid-height"]').addEventListener('input', e => {
        game.changeHeight(e);
    })
    document.querySelector('input[id="grid-height"]').addEventListener('paste', e => {
        game.changeHeight(e);
    })
}

/**
 * The create function is used to put images on-screen initially, create game objects and generally do
 * once off initialisation. Once 'create' has run, we should be able to see our game in the browser
 */
function create() {
    spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Setup cell states
    game.randomizeCellStates(this);
}

function update() {
    if (!game.startGame)
        return;

    // Check for keyboard press
    if (Phaser.Input.Keyboard.JustDown(spacebar)) {
        console.log("SPACEBAR is pressed...");
    }

    // Update the generation
    document.getElementById("generation").innerHTML = game.generation;
}

/************ GAME FUNCTIONS *************/
game.getCell = (r, c) => grid[(r * game.num_cols) + c];

// State updates every 2 seconds
game.updateState = () => {
    /*
        Updating the game state basically means checking each cell in the grid
        and updating it based upon the game's rules
    */

    game.generation++;

    // Apply rules to every cell
    grid = grid.map(cell => {
        return game.applyRules(cell);
    }).map(cell => {
        return game.setNewCellState(cell)
    })
}

/*
    During testing, you can turn off generation updates and force the
    generation to update manually with this method
*/

game.forceStep = () => {
    // Update states
    grid = grid.map(cell => {
        return game.applyRules(cell);
    }).map(cell => {
        return game.setNewCellState(cell)
    })
}

game.setNewCellState = cell => {
    // Update each cell
    if (cell.nextState === cellStates.ALIVE) {
        cell.image.visible = true;
        // Reset states
        cell.state = cellStates.ALIVE;
        cell.nextState = cellStates.NONE;
    }
    else {
        cell.image.visible = false;
        cell.state = cellStates.DEAD;
        cell.nextState = cellStates.NONE;
    }
    return cell;
}

game.applyRules = c => {
    let borderCells = c.getBorderCells(game).filter(c => c.state === cellStates.ALIVE)
    // Loop around border cells
    // 1. Birth: if the cell is dead -> if exactly three of its neighbours are alive, the cell will become alive at the next step
    if (c.state === cellStates.NONE || c.state === cellStates.DEAD) {
        if (borderCells.length === 3) {
            c.nextState = cellStates.ALIVE
        }
    }
    /* 2. if the cell is already alive ->
            a) Survival: if the cell has two or three live neighbours, the cell remains alive.
               Otherwise the cell will die.                      
    */
    else if (c.state === cellStates.ALIVE) {
        if (borderCells.length < 2 || borderCells.length > 3) {
            c.nextState = cellStates.DEAD
        }
        else {
            c.nextState = cellStates.ALIVE
        }
    }
    return c;
}

game.randomizeCellStates = (self) => {
    for (let i = 0; i < game.num_rows; i++) {
        for (let j = 0; j < game.num_cols; j++) {
            let cell = new Cell((i * game.num_cols) + j, i, j);

            // Create an image for all the cells. We will set them invisible unless alive
            cell.image = self.add.sprite(game.xOffset + (cell.getPosition().col * CELL_WIDTH), game.yOffset + (cell.getPosition().row * CELL_HEIGHT), 'cell').setOrigin(0, 0)

            cell.image.visible = false;

            // Set 5% of the cells to be alive
            if (Math.random() * 100 <= INIT_LIVE_CELL_THROTTLE) {
                cell.state = cellStates.ALIVE
                //console.log("Row:", cell.getPosition().row, "Col:", cell.getPosition().col);
                cell.image.visible = true;
            }
            grid.push(cell);
        }
    }
}

/*
    Test method for data setup. Use this instead of 'randomizeCellStates' when testing/debugging
    Change the line in create() that set's up cell states
*/
game.setupTestState = (self) => {

    for (let i = 0; i < game.num_rows; i++) {
        for (let j = 0; j < game.num_cols; j++) {
            let cell = new Cell((i * game.num_cols) + j, i, j);

            cell.image = self.add.sprite(game.xOffset + (cell.getPosition().col * CELL_WIDTH), game.yOffset + (cell.getPosition().row * CELL_HEIGHT), 'cell').setOrigin(0, 0)
            if ((i === 0 && j === 0) || (i === 0 && j === 2) || (i === 1 && j === 1) || (i === 1 && j === 2) || (i === 2 && j === 1)) {
                cell.image.visible = true;
                cell.state = cellStates.ALIVE
            }
            else {
                cell.image.visible = false;
            }
            grid.push(cell);
        }
    }
}

game.changeWidth = e => {
    // Validate the input first!    
    var w = Number(e.target.value)
    game.num_rows = w && w >= 40 ? w : 40
    console.log("game width:", game.num_rows)
}

game.changeHeight = e => {
    // Validate the input first!    
    var h = Number(e.target.value)
    game.num_cols = h && h >= 30 ? w : 30
    console.log("game height:", game.num_cols)
}

/************ END GAME FUNCTIONS *************/

/*
    Returns the 8 border cells around a given cell.
    Where a cell lies on the edge, only the border
    cells around it are returned. Return 'undefined'
    for cells beyond the edges.

    @parameter g - Game instance
*/
function Cell(idx, r, c) {
    var index = idx;
    var row = r;
    var col = c;
    var image;

    var getBorderCells = (g) => {
        var cells = [];
        for (let row = -1; row < 2; row++) {
            for (let col = -1; col < 2; col++) {
                let cell = g.getCell(r + row, c + col)
                if (cell ? cell.getPosition().row === r && cell.getPosition().col === c : null)
                    continue;
                cells.push(cell !== undefined ? cell : {})
            }
        }
        return cells;
    }

    var getPos = () => ({ row: row, col: col })

    return {
        index: index,
        state: cellStates.NONE,
        nextState: cellStates.NONE,
        image: image,
        getPosition: getPos,
        getBorderCells: getBorderCells
    }
}

/*
    Update the game state data every GENERATION_LIFETIME milliseconds
*/
function onTimerEvent() {
    if (game.manualUpdate)
        return;

    game.updateState();
}