/*
 * Reversi (Othello) - Core game logic and AI
 *
 * Board representation:
 *   8x8 two-dimensional array.
 *   0  = empty
 *   1  = black (human player, moves first)
 *  -1  = white (computer)
 *
 * All testable functions are exposed on the global `window.ReversiGame`
 * object so that tests/tests.js can use them without any import statements.
 */
(function (global) {
  'use strict';

  var SIZE = 8;
  var EMPTY = 0;
  var BLACK = 1;
  var WHITE = -1;

  // Eight directions: N, NE, E, SE, S, SW, W, NW.
  var DIRECTIONS = [
    [-1, 0], [-1, 1], [0, 1], [1, 1],
    [1, 0], [1, -1], [0, -1], [-1, -1]
  ];

  // Positional weight matrix used by the Normal and Hard AIs.
  // Corners are highly valued, squares adjacent to corners are penalized.
  var WEIGHTS = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, -1, -1, -1, -1, -2, 10],
    [5, -2, -1, -1, -1, -1, -2, 5],
    [5, -2, -1, -1, -1, -1, -2, 5],
    [10, -2, -1, -1, -1, -1, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
  ];

  function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  // Create a fresh board with the standard four center discs.
  function createBoard() {
    var board = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) {
        row.push(EMPTY);
      }
      board.push(row);
    }
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    return board;
  }

  // Deep copy a board so AI simulation never mutates the live state.
  function cloneBoard(board) {
    var copy = [];
    for (var r = 0; r < SIZE; r++) {
      copy.push(board[r].slice());
    }
    return copy;
  }

  // Return all discs that would be flipped if `player` plays at (row, col).
  // Returns an empty array when the move is illegal.
  function getFlips(board, player, row, col) {
    if (!inBounds(row, col) || board[row][col] !== EMPTY) {
      return [];
    }
    var opponent = -player;
    var flips = [];
    for (var d = 0; d < DIRECTIONS.length; d++) {
      var dr = DIRECTIONS[d][0];
      var dc = DIRECTIONS[d][1];
      var r = row + dr;
      var c = col + dc;
      var line = [];
      while (inBounds(r, c) && board[r][c] === opponent) {
        line.push([r, c]);
        r += dr;
        c += dc;
      }
      if (line.length > 0 && inBounds(r, c) && board[r][c] === player) {
        flips = flips.concat(line);
      }
    }
    return flips;
  }

  function isValidMove(board, player, row, col) {
    return getFlips(board, player, row, col).length > 0;
  }

  // All legal moves for `player` as an array of { row, col }.
  function getLegalMoves(board, player) {
    var moves = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === EMPTY && getFlips(board, player, r, c).length > 0) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  function hasAnyMove(board, player) {
    return getLegalMoves(board, player).length > 0;
  }

  // Apply a move immutably. Returns the new board and flipped discs.
  // Throws when the move is illegal so callers cannot silently corrupt state.
  function applyMove(board, player, row, col) {
    var flips = getFlips(board, player, row, col);
    if (flips.length === 0) {
      throw new Error('Illegal move at (' + row + ', ' + col + ')');
    }
    var next = cloneBoard(board);
    next[row][col] = player;
    for (var i = 0; i < flips.length; i++) {
      next[flips[i][0]][flips[i][1]] = player;
    }
    return { board: next, flipped: flips };
  }

  function countDiscs(board) {
    var black = 0;
    var white = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === BLACK) {
          black++;
        } else if (board[r][c] === WHITE) {
          white++;
        }
      }
    }
    return { black: black, white: white };
  }

  // Game is over when neither player can move.
  function isGameOver(board) {
    return !hasAnyMove(board, BLACK) && !hasAnyMove(board, WHITE);
  }

  // Returns BLACK, WHITE, or 0 for a draw. Only meaningful once game is over.
  function getWinner(board) {
    var counts = countDiscs(board);
    if (counts.black > counts.white) {
      return BLACK;
    }
    if (counts.white > counts.black) {
      return WHITE;
    }
    return 0;
  }

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- AI difficulty levels -------------------------------------------------

  // Easy: pick a completely random legal move.
  function easyMove(board, player) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    return randomChoice(moves);
  }

  // Normal: greedy. Score each immediate move by the positional weight of the
  // square played plus the weight of every disc flipped, choose the best.
  function normalMove(board, player) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    var best = [];
    var bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var flips = getFlips(board, player, move.row, move.col);
      var score = WEIGHTS[move.row][move.col];
      for (var f = 0; f < flips.length; f++) {
        score += WEIGHTS[flips[f][0]][flips[f][1]];
      }
      if (score > bestScore) {
        bestScore = score;
        best = [move];
      } else if (score === bestScore) {
        best.push(move);
      }
    }
    return randomChoice(best);
  }

  // Heuristic evaluation from the perspective of `player`.
  function evaluate(board, player) {
    var positional = 0;
    var stability = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === player) {
          positional += WEIGHTS[r][c];
          if (r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1) {
            stability += 10;
          }
        }
      }
    }
    var mobility =
      (getLegalMoves(board, player).length -
        getLegalMoves(board, -player).length) * 5;
    return positional + mobility + stability;
  }

  // Minimax with alpha-beta pruning. `rootPlayer` is whose score we maximize.
  function minimax(board, current, depth, alpha, beta, rootPlayer) {
    if (depth === 0 || isGameOver(board)) {
      return evaluate(board, rootPlayer);
    }
    var moves = getLegalMoves(board, current);
    // No move available: pass the turn (without consuming depth twice).
    if (moves.length === 0) {
      return minimax(board, -current, depth, alpha, beta, rootPlayer);
    }

    var maximizing = current === rootPlayer;
    var value = maximizing ? -Infinity : Infinity;

    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var next = applyMove(board, current, move.row, move.col).board;
      var childValue = minimax(next, -current, depth - 1, alpha, beta, rootPlayer);
      if (maximizing) {
        if (childValue > value) {
          value = childValue;
        }
        if (value > alpha) {
          alpha = value;
        }
      } else {
        if (childValue < value) {
          value = childValue;
        }
        if (value < beta) {
          beta = value;
        }
      }
      if (beta <= alpha) {
        break;
      }
    }
    return value;
  }

  // Hard: minimax + alpha-beta at a fixed depth.
  function hardMove(board, player, depth) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    var searchDepth = typeof depth === 'number' ? depth : 5;
    var best = [];
    var bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var next = applyMove(board, player, move.row, move.col).board;
      var score = minimax(next, -player, searchDepth - 1, -Infinity, Infinity, player);
      if (score > bestScore) {
        bestScore = score;
        best = [move];
      } else if (score === bestScore) {
        best.push(move);
      }
    }
    return randomChoice(best);
  }

  // Dispatch to the requested difficulty. Returns a { row, col } move or null.
  function getAIMove(board, player, difficulty) {
    switch (difficulty) {
      case 'easy':
        return easyMove(board, player);
      case 'hard':
        return hardMove(board, player);
      case 'normal':
      default:
        return normalMove(board, player);
    }
  }

  // --- Encapsulated game state ----------------------------------------------

  function GameState() {
    this.reset();
  }

  GameState.prototype.reset = function () {
    this.board = createBoard();
    this.currentPlayer = BLACK;
    this.lastMove = null;
    this.lastFlipped = [];
    this.gameOver = false;
  };

  GameState.prototype.getScores = function () {
    return countDiscs(this.board);
  };

  GameState.prototype.getLegalMoves = function () {
    return getLegalMoves(this.board, this.currentPlayer);
  };

  // Play a move for the current player and advance the turn, auto-passing
  // when the next player has no legal moves. Returns the flipped discs.
  GameState.prototype.play = function (row, col) {
    var result = applyMove(this.board, this.currentPlayer, row, col);
    this.board = result.board;
    this.lastMove = { row: row, col: col, player: this.currentPlayer };
    this.lastFlipped = result.flipped;
    this.advanceTurn();
    return result.flipped;
  };

  // Move to the next player, skipping a player with no moves, and detect end.
  GameState.prototype.advanceTurn = function () {
    var next = -this.currentPlayer;
    if (hasAnyMove(this.board, next)) {
      this.currentPlayer = next;
    } else if (hasAnyMove(this.board, this.currentPlayer)) {
      // Opponent passes; same player keeps the turn.
    } else {
      this.gameOver = true;
    }
  };

  GameState.prototype.getWinner = function () {
    return getWinner(this.board);
  };

  var ReversiGame = {
    SIZE: SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    WEIGHTS: WEIGHTS,
    createBoard: createBoard,
    cloneBoard: cloneBoard,
    inBounds: inBounds,
    getFlips: getFlips,
    isValidMove: isValidMove,
    getLegalMoves: getLegalMoves,
    hasAnyMove: hasAnyMove,
    applyMove: applyMove,
    countDiscs: countDiscs,
    isGameOver: isGameOver,
    getWinner: getWinner,
    evaluate: evaluate,
    easyMove: easyMove,
    normalMove: normalMove,
    hardMove: hardMove,
    getAIMove: getAIMove,
    GameState: GameState
  };

  global.ReversiGame = ReversiGame;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReversiGame;
  }
})(typeof window !== 'undefined' ? window : this);
