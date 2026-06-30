/*
 * UI controller for the Reversi game. Uses the global `ReversiGame` object
 * (from game.js) for all rules and AI decisions. Kept separate from game.js so
 * the game logic stays free of DOM dependencies and remains testable.
 */
(function (global) {
  'use strict';

  var R = global.ReversiGame;
  var BOARD_SIZE = R.BOARD_SIZE;
  var HUMAN = R.BLACK;
  var CPU = R.WHITE;
  var AI_DELAY = 450; // ms before the CPU plays, so flips are visible.

  var state = {
    board: R.createBoard(),
    currentPlayer: HUMAN,
    difficulty: 'normal',
    lastMove: null,
    flipped: [],
    locked: false,
    gameOver: false
  };

  var boardEl;
  var statusEl;
  var turnEl;
  var scoreBlackEl;
  var scoreWhiteEl;
  var scoreBlackBox;
  var scoreWhiteBox;

  function init() {
    boardEl = document.getElementById('board');
    statusEl = document.getElementById('status');
    turnEl = document.getElementById('turn-indicator');
    scoreBlackEl = document.getElementById('score-black-value');
    scoreWhiteEl = document.getElementById('score-white-value');
    scoreBlackBox = document.getElementById('score-black');
    scoreWhiteBox = document.getElementById('score-white');

    buildGrid();

    document.getElementById('restart').addEventListener('click', restart);

    var radios = document.querySelectorAll('input[name="difficulty"]');
    radios.forEach(function (radio) {
      if (radio.value === state.difficulty) {
        radio.checked = true;
      }
      radio.addEventListener('change', function () {
        if (radio.checked) {
          // Changing difficulty must not reset board/score; it takes effect on
          // the AI's next turn.
          state.difficulty = radio.value;
        }
      });
    });

    render();
    maybeRunAI();
  }

  function buildGrid() {
    boardEl.innerHTML = '';
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function cellAt(r, c) {
    return boardEl.children[r * BOARD_SIZE + c];
  }

  function onCellClick(event) {
    if (state.locked || state.gameOver) {
      return;
    }
    if (state.currentPlayer !== HUMAN) {
      return;
    }
    var cell = event.currentTarget;
    var r = parseInt(cell.dataset.row, 10);
    var c = parseInt(cell.dataset.col, 10);
    if (!R.isLegalMove(state.board, r, c, HUMAN)) {
      return;
    }
    playMove(r, c, HUMAN);
  }

  function playMove(r, c, player) {
    var result = R.applyMove(state.board, r, c, player);
    if (!result) {
      return;
    }
    state.board = result.board;
    state.lastMove = [r, c];
    state.flipped = result.flipped;
    advanceTurn();
  }

  function advanceTurn() {
    if (R.isGameOver(state.board)) {
      state.gameOver = true;
      render();
      announceResult();
      return;
    }
    var next = R.getNextPlayer(state.board, state.currentPlayer);
    var passed = next === state.currentPlayer;
    state.currentPlayer = next;
    render();
    if (passed) {
      var name = next === HUMAN ? '黒 (You)' : '白 (CPU)';
      statusEl.textContent = (next === HUMAN ? '白 (CPU)' : '黒 (You)') +
        ' はパスしました。' + name + ' の手番です。';
    } else {
      statusEl.textContent = '';
    }
    maybeRunAI();
  }

  function maybeRunAI() {
    if (state.gameOver || state.currentPlayer !== CPU) {
      return;
    }
    state.locked = true;
    render();
    setTimeout(function () {
      // Read the difficulty fresh so mid-game changes apply now.
      var move = R.chooseAIMove(state.board, CPU, state.difficulty);
      state.locked = false;
      if (move) {
        playMove(move[0], move[1], CPU);
      } else {
        // No move: treat as pass.
        advanceTurn();
      }
    }, AI_DELAY);
  }

  function restart() {
    state.board = R.createBoard();
    state.currentPlayer = HUMAN;
    state.lastMove = null;
    state.flipped = [];
    state.locked = false;
    state.gameOver = false;
    statusEl.textContent = '';
    render();
    maybeRunAI();
  }

  function isFlipped(r, c) {
    for (var i = 0; i < state.flipped.length; i++) {
      if (state.flipped[i][0] === r && state.flipped[i][1] === c) {
        return true;
      }
    }
    return false;
  }

  function render() {
    var legal = state.gameOver || state.currentPlayer !== HUMAN
      ? []
      : R.getLegalMoves(state.board, HUMAN);
    var legalSet = {};
    legal.forEach(function (m) {
      legalSet[m[0] + ',' + m[1]] = true;
    });

    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        renderCell(r, c, legalSet);
      }
    }

    var score = R.getScore(state.board);
    scoreBlackEl.textContent = String(score.black);
    scoreWhiteEl.textContent = String(score.white);

    scoreBlackBox.classList.toggle('active',
      !state.gameOver && state.currentPlayer === HUMAN);
    scoreWhiteBox.classList.toggle('active',
      !state.gameOver && state.currentPlayer === CPU);

    if (state.gameOver) {
      turnEl.textContent = 'ゲーム終了 / Game Over';
    } else if (state.currentPlayer === HUMAN) {
      turnEl.textContent = '黒 (You)';
    } else {
      turnEl.textContent = '白 (CPU)';
    }
  }

  function renderCell(r, c, legalSet) {
    var cell = cellAt(r, c);
    var value = state.board[r][c];
    var classes = ['cell'];

    if (state.locked || state.gameOver) {
      classes.push('locked');
    }
    if (legalSet[r + ',' + c]) {
      classes.push('legal');
    }
    if (state.lastMove && state.lastMove[0] === r && state.lastMove[1] === c) {
      classes.push('last-move');
    }
    if (isFlipped(r, c)) {
      classes.push('flipped');
    }
    cell.className = classes.join(' ');

    var wrap = cell.querySelector('.disc-wrap');
    if (value === R.EMPTY) {
      if (wrap) {
        cell.removeChild(wrap);
      }
      return;
    }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'disc-wrap';
      var front = document.createElement('div');
      front.className = 'disc-face front';
      var back = document.createElement('div');
      back.className = 'disc-face back';
      wrap.appendChild(front);
      wrap.appendChild(back);
      cell.appendChild(wrap);
    }
    wrap.classList.toggle('show-black', value === R.BLACK);
    wrap.classList.toggle('show-white', value === R.WHITE);
  }

  function announceResult() {
    var score = R.getScore(state.board);
    var winner = R.getWinner(state.board);
    var text;
    if (winner === R.BLACK) {
      text = '黒 (You) の勝ち！';
    } else if (winner === R.WHITE) {
      text = '白 (CPU) の勝ち！';
    } else {
      text = '引き分け / Draw';
    }
    statusEl.textContent = text + ' (黒 ' + score.black + ' - 白 ' +
      score.white + ')';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
