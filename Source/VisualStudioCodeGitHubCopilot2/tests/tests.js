function assert(cond,msg){
  const d=document.createElement('div'); d.textContent=msg+': '; d.className=cond? 'pass':'fail'; d.innerHTML += cond?'<strong>PASS</strong>':'<strong>FAIL</strong>';
  document.getElementById('results').appendChild(d);
}

function testInitialSetup(){
  const b=ReversiGame.createEmptyBoard();
  assert(b[3][3]===ReversiGame.WHITE && b[3][4]===ReversiGame.BLACK && b[4][3]===ReversiGame.BLACK && b[4][4]===ReversiGame.WHITE,'testInitialSetup');
}

function testLegalMoveGeneration(){
  const b=ReversiGame.createEmptyBoard();
  const moves=ReversiGame.getLegalMoves(b,ReversiGame.BLACK);
  // Standard initial legal moves for black
  const expected=[[2,3],[3,2],[4,5],[5,4]];
  const ok=expected.every(e=>moves.some(m=>m[0]===e[0]&&m[1]===e[1]));
  assert(ok,'testLegalMoveGeneration');
}

function testMoveExecutionAndFlipping(){
  const b=ReversiGame.createEmptyBoard();
  const res=ReversiGame.applyMove(b,ReversiGame.BLACK,2,3);
  assert(res && res.board[3][3]===ReversiGame.BLACK,'testMoveExecutionAndFlipping');
}

function testInvalidMoveRejection(){
  const b=ReversiGame.createEmptyBoard();
  const outside=ReversiGame.applyMove(b,ReversiGame.BLACK,-1,0);
  const noflip=ReversiGame.applyMove(b,ReversiGame.BLACK,0,0);
  assert(outside===null && noflip===null,'testInvalidMoveRejection');
}

function testPassTurnBehavior(){
  // Create board where white has no moves
  const b=Array.from({length:8},()=>Array(8).fill(ReversiGame.BLACK));
  b[0][0]=ReversiGame.EMPTY; // only black fill mostly
  const whiteMoves=ReversiGame.getLegalMoves(b,ReversiGame.WHITE);
  const blackMoves=ReversiGame.getLegalMoves(b,ReversiGame.BLACK);
  assert(whiteMoves.length===0 && blackMoves.length>=0,'testPassTurnBehavior');
}

function testGameOverDetection(){
  const b=Array.from({length:8},()=>Array(8).fill(ReversiGame.BLACK));
  const over=ReversiGame.isGameOver(b);
  const score=ReversiGame.countPieces(b);
  assert(over===true && score.black===64,'testGameOverDetection');
}

function testAIMoveLegality(){
  const b=ReversiGame.createEmptyBoard();
  const easy=ReversiGame.aiEasy(b,ReversiGame.BLACK);
  const normal=ReversiGame.aiNormal(b,ReversiGame.BLACK);
  const hard=ReversiGame.aiHard(b,ReversiGame.BLACK,3);
  const all=[easy,normal,hard];
  const ok=all.every(m=>m===null || (m[0]>=0&&m[0]<8&&m[1]>=0&&m[1]<8));
  assert(ok,'testAIMoveLegality');
}

window.addEventListener('DOMContentLoaded', ()=>{
  testInitialSetup();
  testLegalMoveGeneration();
  testMoveExecutionAndFlipping();
  testInvalidMoveRejection();
  testPassTurnBehavior();
  testGameOverDetection();
  testAIMoveLegality();
});
/*
 * Zero-dependency test suite for the Reversi logic.
 *
 * game.js exposes everything on the global `ReversiGame` object, so this file
 * uses it directly with no import statements. Both files are loaded via
 * <script> tags from tests.html. Results render into the page when a DOM is
 * present, and also log to the console.
 */
(function (global) {
  'use strict';

  var R = global.ReversiGame;
  var results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function test(name, fn) {
    try {
      fn();
      results.push({ name: name, pass: true, message: '' });
    } catch (err) {
      results.push({ name: name, pass: false, message: err.message });
    }
  }

  // Helper: build an empty board for crafting specific scenarios.
  function emptyBoard() {
    var board = [];
    for (var r = 0; r < R.SIZE; r++) {
      var row = [];
      for (var c = 0; c < R.SIZE; c++) {
        row.push(R.EMPTY);
      }
      board.push(row);
    }
    return board;
  }

  function sortMoves(moves) {
    return moves.slice().sort(function (m1, m2) {
      return m1.row - m2.row || m1.col - m2.col;
    });
  }

  // 1. Initial setup: four discs in the center.
  test('testInitialSetup', function () {
    var board = R.createBoard();
    assert(board[3][3] === R.WHITE, '(3,3) should be white');
    assert(board[4][4] === R.WHITE, '(4,4) should be white');
    assert(board[3][4] === R.BLACK, '(3,4) should be black');
    assert(board[4][3] === R.BLACK, '(4,3) should be black');
    var counts = R.countDiscs(board);
    assert(counts.black === 2 && counts.white === 2, 'should start 2-2');
  });

  // 2. Legal move generation for the opening position (black to move).
  test('testLegalMoveGeneration', function () {
    var board = R.createBoard();
    var moves = sortMoves(R.getLegalMoves(board, R.BLACK));
    var expected = sortMoves([
      { row: 2, col: 3 },
      { row: 3, col: 2 },
      { row: 4, col: 5 },
      { row: 5, col: 4 }
    ]);
    assert(moves.length === 4, 'expected 4 opening moves, got ' + moves.length);
    assert(deepEqual(moves, expected), 'opening legal moves mismatch');
  });

  // 3. Move execution flips discs in multiple directions.
  test('testMoveExecutionAndFlipping', function () {
    // Black plays at the empty (3,3). White discs sit to the right, below and
    // diagonally, each capped by a black disc, so all three lines flip.
    var b = emptyBoard();
    b[3][4] = R.WHITE; b[3][5] = R.BLACK;          // right of (3,3)
    b[4][3] = R.WHITE; b[5][3] = R.BLACK;          // below (3,3)
    b[4][4] = R.WHITE; b[5][5] = R.BLACK;          // diagonal of (3,3)
    var result = R.applyMove(b, R.BLACK, 3, 3);
    assert(result.flipped.length === 3, 'should flip 3 discs in 3 directions');
    assert(result.board[3][4] === R.BLACK, 'right neighbor flipped');
    assert(result.board[4][3] === R.BLACK, 'down neighbor flipped');
    assert(result.board[4][4] === R.BLACK, 'diagonal neighbor flipped');
    // Original board is untouched (immutability).
    assert(b[3][3] === R.EMPTY, 'applyMove must not mutate input board');
  });

  // 4. Invalid moves are rejected.
  test('testInvalidMoveRejection', function () {
    var board = R.createBoard();
    // Out of bounds.
    assert(R.isValidMove(board, R.BLACK, -1, 0) === false, 'OOB rejected');
    assert(R.isValidMove(board, R.BLACK, 8, 8) === false, 'OOB rejected');
    // Occupied square.
    assert(R.isValidMove(board, R.BLACK, 3, 3) === false, 'occupied rejected');
    // Empty but flips nothing.
    assert(R.isValidMove(board, R.BLACK, 0, 0) === false, 'no-flip rejected');
    var threw = false;
    try {
      R.applyMove(board, R.BLACK, 0, 0);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'applyMove should throw on an illegal move');
  });

  // 5. Pass behavior: a player with no moves is skipped.
  test('testPassTurnBehavior', function () {
    // Board is entirely black except two isolated white discs, each with one
    // empty neighbor that only black can use. White therefore has no legal
    // move, while black still has a move left after playing the first one.
    var board = emptyBoard();
    for (var r = 0; r < R.SIZE; r++) {
      for (var c = 0; c < R.SIZE; c++) {
        board[r][c] = R.BLACK;
      }
    }
    board[0][0] = R.EMPTY; board[0][1] = R.WHITE; // black move at (0,0)
    board[7][7] = R.EMPTY; board[7][6] = R.WHITE; // black move at (7,7)

    // Sanity: white cannot move, black can.
    assert(R.hasAnyMove(board, R.WHITE) === false, 'white should have no move');
    assert(R.hasAnyMove(board, R.BLACK) === true, 'black should have a move');

    var s = new R.GameState();
    s.board = board;
    s.currentPlayer = R.BLACK;
    s.gameOver = false;
    s.play(0, 0); // black moves; white must pass.

    assert(s.board[0][1] === R.BLACK, 'white disc captured');
    // White has no move, so the turn passes back to black.
    assert(s.currentPlayer === R.BLACK, 'turn should remain black after pass');
    assert(s.gameOver === false, 'game not over while black can still move');
  });

  // 6. Game over detection and winner/score calculation.
  test('testGameOverDetection', function () {
    var board = emptyBoard();
    // Fill the whole board with black except keep it fully occupied so no
    // moves exist for either player.
    for (var r = 0; r < R.SIZE; r++) {
      for (var c = 0; c < R.SIZE; c++) {
        board[r][c] = R.BLACK;
      }
    }
    board[0][0] = R.WHITE;
    board[0][1] = R.WHITE;
    assert(R.isGameOver(board) === true, 'full board is game over');
    var counts = R.countDiscs(board);
    assert(counts.black === 62 && counts.white === 2, 'score count correct');
    assert(R.getWinner(board) === R.BLACK, 'black wins');

    // Draw detection.
    var drawBoard = emptyBoard();
    for (var dr = 0; dr < R.SIZE; dr++) {
      for (var dc = 0; dc < R.SIZE; dc++) {
        drawBoard[dr][dc] = (dr < 4) ? R.BLACK : R.WHITE;
      }
    }
    assert(R.getWinner(drawBoard) === 0, 'equal discs is a draw');
  });

  // 7. Every AI level returns only legal moves.
  test('testAIMoveLegality', function () {
    var levels = ['easy', 'normal', 'hard'];
    for (var i = 0; i < levels.length; i++) {
      var board = R.createBoard();
      var move = R.getAIMove(board, R.BLACK, levels[i]);
      assert(move !== null, levels[i] + ' should return a move');
      assert(
        R.isValidMove(board, R.BLACK, move.row, move.col),
        levels[i] + ' returned an illegal move'
      );
    }
    // AI returns null when no move is available.
    var stuck = emptyBoard();
    stuck[0][0] = R.BLACK;
    assert(R.easyMove(stuck, R.WHITE) === null, 'null when no legal move');
  });

  // --- Reporting ------------------------------------------------------------

  var passed = 0;
  for (var i = 0; i < results.length; i++) {
    if (results[i].pass) {
      passed++;
    }
  }
  var allPass = passed === results.length;

  if (typeof document !== 'undefined') {
    var listEl = document.getElementById('results');
    var summaryEl = document.getElementById('summary');
    if (listEl) {
      for (var j = 0; j < results.length; j++) {
        var item = results[j];
        var li = document.createElement('li');
        var tag = document.createElement('span');
        tag.className = 'tag ' + (item.pass ? 'tag--pass' : 'tag--fail');
        tag.textContent = item.pass ? 'PASS' : 'FAIL';
        var name = document.createElement('span');
        name.className = 'name';
        name.textContent = item.name;
        li.appendChild(tag);
        li.appendChild(name);
        if (!item.pass) {
          var msg = document.createElement('span');
          msg.className = 'msg';
          msg.textContent = item.message;
          li.appendChild(msg);
        }
        listEl.appendChild(li);
      }
    }
    if (summaryEl) {
      summaryEl.textContent =
        passed + ' / ' + results.length + ' passed';
      summaryEl.className = allPass ? 'summary--pass' : 'summary--fail';
    }
  }

  if (typeof console !== 'undefined') {
    for (var k = 0; k < results.length; k++) {
      var rr = results[k];
      console.log((rr.pass ? 'PASS' : 'FAIL') + ' - ' + rr.name +
        (rr.pass ? '' : ' :: ' + rr.message));
    }
    console.log(passed + ' / ' + results.length + ' passed');
  }
})(typeof window !== 'undefined' ? window : this);
