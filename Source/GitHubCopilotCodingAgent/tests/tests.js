/*
 * Minimal, dependency-free assertion-based test suite for the Reversi logic.
 * Loaded by tests.html via a <script> tag together with ../game.js.
 * Uses the global `ReversiGame` object; no import statements.
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

  function sortMoves(moves) {
    return moves.slice().sort(function (x, y) {
      return x[0] - y[0] || x[1] - y[1];
    });
  }

  function emptyBoard() {
    var board = [];
    for (var r = 0; r < R.BOARD_SIZE; r++) {
      var row = [];
      for (var c = 0; c < R.BOARD_SIZE; c++) {
        row.push(R.EMPTY);
      }
      board.push(row);
    }
    return board;
  }

  // 1. Initial setup: central four stones are correct.
  function testInitialSetup() {
    var board = R.createBoard();
    assert(board[3][3] === R.WHITE, 'd4 should be white');
    assert(board[4][4] === R.WHITE, 'e5 should be white');
    assert(board[3][4] === R.BLACK, 'e4 should be black');
    assert(board[4][3] === R.BLACK, 'd5 should be black');
    var score = R.getScore(board);
    assert(score.black === 2 && score.white === 2,
      'initial score should be 2-2');
  }

  // 2. Legal move generation from the standard opening for black.
  function testLegalMoveGeneration() {
    var board = R.createBoard();
    var moves = sortMoves(R.getLegalMoves(board, R.BLACK));
    var expected = sortMoves([[2, 3], [3, 2], [4, 5], [5, 4]]);
    assert(deepEqual(moves, expected),
      'black opening moves incorrect: ' + JSON.stringify(moves));
  }

  // 3. Move execution flips stones in multiple directions.
  function testMoveExecutionAndFlipping() {
    var board = emptyBoard();
    // Black at center, surrounded by white lines bracketed by black.
    board[3][3] = R.BLACK;
    // Horizontal: B at (3,3) ... whites ... black plays at (3,6)? Build a
    // multi-direction flip around an empty target (4,4).
    board = emptyBoard();
    board[4][4] = R.EMPTY;
    // Direction up: (3,4)=W, (2,4)=B
    board[3][4] = R.WHITE;
    board[2][4] = R.BLACK;
    // Direction left: (4,3)=W, (4,2)=B
    board[4][3] = R.WHITE;
    board[4][2] = R.BLACK;
    // Direction up-left: (3,3)=W, (2,2)=B
    board[3][3] = R.WHITE;
    board[2][2] = R.BLACK;

    var result = R.applyMove(board, 4, 4, R.BLACK);
    assert(result !== null, 'move at (4,4) should be legal');
    assert(result.board[4][4] === R.BLACK, 'placed stone should be black');
    assert(result.board[3][4] === R.BLACK, 'up flip failed');
    assert(result.board[4][3] === R.BLACK, 'left flip failed');
    assert(result.board[3][3] === R.BLACK, 'diagonal flip failed');
    assert(result.flipped.length === 3, 'should flip exactly 3 stones');
  }

  // 4. Invalid moves (off-board, no flips, occupied) are rejected.
  function testInvalidMoveRejection() {
    var board = R.createBoard();
    assert(R.applyMove(board, -1, 0, R.BLACK) === null,
      'off-board move should be rejected');
    assert(R.applyMove(board, 8, 8, R.BLACK) === null,
      'off-board move should be rejected');
    assert(R.applyMove(board, 0, 0, R.BLACK) === null,
      'non-flipping move should be rejected');
    assert(R.applyMove(board, 3, 3, R.BLACK) === null,
      'occupied square should be rejected');
    assert(R.isLegalMove(board, 2, 3, R.BLACK) === true,
      '(2,3) should be a legal black move');
  }

  // 5. Pass behavior: a player with no move yields the turn.
  function testPassTurnBehavior() {
    var board = emptyBoard();
    // Only black and white stones such that white has a move but black has
    // none. Setup: white can play, black cannot.
    board[0][0] = R.WHITE;
    board[0][1] = R.BLACK;
    // White playing (0,2) would flip (0,1). Black has no legal move anywhere.
    board[0][2] = R.EMPTY;
    assert(R.getLegalMoves(board, R.BLACK).length === 0,
      'black should have no legal moves');
    assert(R.getLegalMoves(board, R.WHITE).length > 0,
      'white should have at least one legal move');
    // It is black's turn but black must pass -> next player is white.
    var next = R.getNextPlayer(board, R.BLACK);
    assert(next === R.WHITE, 'turn should pass to white');
  }

  // 6. Game over detection, winner and score calculation.
  function testGameOverDetection() {
    // Full board, black majority.
    var board = emptyBoard();
    for (var r = 0; r < R.BOARD_SIZE; r++) {
      for (var c = 0; c < R.BOARD_SIZE; c++) {
        board[r][c] = R.BLACK;
      }
    }
    board[0][0] = R.WHITE;
    board[0][1] = R.WHITE;
    assert(R.isGameOver(board) === true, 'full board should be game over');
    var score = R.getScore(board);
    assert(score.black === 62 && score.white === 2,
      'score should be 62-2: ' + JSON.stringify(score));
    assert(R.getWinner(board) === R.BLACK, 'black should win');

    // Draw board.
    var draw = emptyBoard();
    for (var r2 = 0; r2 < R.BOARD_SIZE; r2++) {
      for (var c2 = 0; c2 < R.BOARD_SIZE; c2++) {
        draw[r2][c2] = (c2 < 4) ? R.BLACK : R.WHITE;
      }
    }
    assert(R.getWinner(draw) === R.EMPTY, 'even board should be a draw');
  }

  // 7. All AI levels return only legal moves.
  function testAIMoveLegality() {
    var levels = ['easy', 'normal', 'hard'];
    for (var i = 0; i < levels.length; i++) {
      var board = R.createBoard();
      var move = R.chooseAIMove(board, R.BLACK, levels[i]);
      assert(move !== null, levels[i] + ' should return a move');
      assert(R.isLegalMove(board, move[0], move[1], R.BLACK),
        levels[i] + ' returned an illegal move: ' + JSON.stringify(move));
    }
    // When no move exists, AI returns null.
    var blocked = emptyBoard();
    assert(R.chooseAIMove(blocked, R.BLACK, 'hard') === null,
      'AI should return null when no legal move exists');
  }

  var TESTS = [
    { name: 'testInitialSetup', fn: testInitialSetup },
    { name: 'testLegalMoveGeneration', fn: testLegalMoveGeneration },
    { name: 'testMoveExecutionAndFlipping', fn: testMoveExecutionAndFlipping },
    { name: 'testInvalidMoveRejection', fn: testInvalidMoveRejection },
    { name: 'testPassTurnBehavior', fn: testPassTurnBehavior },
    { name: 'testGameOverDetection', fn: testGameOverDetection },
    { name: 'testAIMoveLegality', fn: testAIMoveLegality }
  ];

  function runTests() {
    results = [];
    for (var i = 0; i < TESTS.length; i++) {
      var t = TESTS[i];
      try {
        t.fn();
        results.push({ name: t.name, passed: true, message: '' });
      } catch (e) {
        results.push({ name: t.name, passed: false, message: e.message });
      }
    }
    return results;
  }

  function render(container) {
    if (!container) {
      return;
    }
    var passed = 0;
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var res = results[i];
      if (res.passed) {
        passed++;
      }
      html += '<li class="test ' + (res.passed ? 'pass' : 'fail') + '">' +
        '<span class="status">' + (res.passed ? 'PASS' : 'FAIL') + '</span>' +
        '<span class="name">' + res.name + '</span>' +
        (res.passed ? '' : '<span class="message">' + res.message + '</span>') +
        '</li>';
    }
    var summary = passed + ' / ' + results.length + ' tests passed';
    container.innerHTML =
      '<p class="summary ' + (passed === results.length ? 'pass' : 'fail') +
      '">' + summary + '</p><ul class="test-list">' + html + '</ul>';
  }

  global.ReversiTests = {
    runTests: runTests,
    render: render,
    getResults: function () { return results; }
  };

  // Auto-run in the browser when the DOM is ready.
  if (typeof document !== 'undefined') {
    var start = function () {
      runTests();
      render(document.getElementById('results'));
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})(typeof window !== 'undefined' ? window : this);
