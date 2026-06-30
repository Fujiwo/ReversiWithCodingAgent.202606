/*
 * Reversi (Othello) core game logic and AI.
 *
 * Board representation:
 *   0  = empty
 *   1  = black (human, moves first)
 *  -1  = white (computer)
 *
 * All testable functions are exposed on the global `ReversiGame` object so
 * that `tests/tests.js` can use them without any import statements.
 */
(function (global) {
  'use strict';

  var BOARD_SIZE = 8;
  var EMPTY = 0;
  var BLACK = 1;
  var WHITE = -1;

  // Eight directions: N, NE, E, SE, S, SW, W, NW.
  var DIRECTIONS = [
    [-1, 0], [-1, 1], [0, 1], [1, 1],
    [1, 0], [1, -1], [0, -1], [-1, -1]
  ];

  // Positional weight matrix used by the Normal and Hard AIs.
  // Corners are most valuable; squares adjacent to corners are dangerous.
  var WEIGHT_MATRIX = [
    [100, -20, 10,  5,  5, 10, -20, 100],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [ 10,  -5, 15,  3,  3, 15,  -5,  10],
    [  5,  -5,  3,  3,  3,  3,  -5,   5],
    [  5,  -5,  3,  3,  3,  3,  -5,   5],
    [ 10,  -5, 15,  3,  3, 15,  -5,  10],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [100, -20, 10,  5,  5, 10, -20, 100]
  ];

  /**
   * Create an empty board with the standard four-stone starting position.
   * @returns {number[][]} an 8x8 board.
   */
  function createBoard() {
    var board = [];
    for (var r = 0; r < BOARD_SIZE; r++) {
      var row = [];
      for (var c = 0; c < BOARD_SIZE; c++) {
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

  /**
   * Deep clone a board.
   * @param {number[][]} board
   * @returns {number[][]}
   */
  function cloneBoard(board) {
    var copy = [];
    for (var r = 0; r < board.length; r++) {
      copy.push(board[r].slice());
    }
    return copy;
  }

  /**
   * Whether (row, col) is inside the board.
   */
  function isOnBoard(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  /**
   * Get the list of opponent stones that would be flipped if `player` plays at
   * (row, col). Returns an array of [row, col] coordinates (empty if the move
   * is illegal).
   * @param {number[][]} board
   * @param {number} row
   * @param {number} col
   * @param {number} player
   * @returns {Array.<Array.<number>>}
   */
  function getFlips(board, row, col, player) {
    if (!isOnBoard(row, col) || board[row][col] !== EMPTY) {
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
      while (isOnBoard(r, c) && board[r][c] === opponent) {
        line.push([r, c]);
        r += dr;
        c += dc;
      }
      if (line.length > 0 && isOnBoard(r, c) && board[r][c] === player) {
        flips = flips.concat(line);
      }
    }
    return flips;
  }

  /**
   * Whether `player` may legally play at (row, col).
   */
  function isLegalMove(board, row, col, player) {
    return getFlips(board, row, col, player).length > 0;
  }

  /**
   * Get all legal moves for `player`.
   * @returns {Array.<Array.<number>>} array of [row, col].
   */
  function getLegalMoves(board, player) {
    var moves = [];
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (getFlips(board, r, c, player).length > 0) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }

  /**
   * Apply a move for `player` at (row, col) on a clone of the board.
   * Returns the new board and the flipped stones, or null if illegal.
   * @returns {{board: number[][], flipped: Array.<Array.<number>>}|null}
   */
  function applyMove(board, row, col, player) {
    var flips = getFlips(board, row, col, player);
    if (flips.length === 0) {
      return null;
    }
    var next = cloneBoard(board);
    next[row][col] = player;
    for (var i = 0; i < flips.length; i++) {
      next[flips[i][0]][flips[i][1]] = player;
    }
    return { board: next, flipped: flips };
  }

  /**
   * Count black/white stones on the board.
   * @returns {{black: number, white: number}}
   */
  function getScore(board) {
    var black = 0;
    var white = 0;
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === BLACK) {
          black++;
        } else if (board[r][c] === WHITE) {
          white++;
        }
      }
    }
    return { black: black, white: white };
  }

  /**
   * Whether the game is over (neither player has a legal move).
   */
  function isGameOver(board) {
    return getLegalMoves(board, BLACK).length === 0 &&
      getLegalMoves(board, WHITE).length === 0;
  }

  /**
   * Determine the winner: BLACK, WHITE, or 0 for a draw.
   */
  function getWinner(board) {
    var score = getScore(board);
    if (score.black > score.white) {
      return BLACK;
    }
    if (score.white > score.black) {
      return WHITE;
    }
    return EMPTY;
  }

  /**
   * Given the current player, return the player who should move next.
   * If the opponent has a move, it's their turn; otherwise if the current
   * player still has a move, they continue; otherwise the game is over and the
   * current player is returned unchanged.
   */
  function getNextPlayer(board, player) {
    var opponent = -player;
    if (getLegalMoves(board, opponent).length > 0) {
      return opponent;
    }
    if (getLegalMoves(board, player).length > 0) {
      return player;
    }
    return player;
  }

  // ---------------------------------------------------------------------------
  // AI
  // ---------------------------------------------------------------------------

  var HARD_DEPTH = 5;

  function isEdgeOrCorner(row, col) {
    return row === 0 || row === BOARD_SIZE - 1 ||
      col === 0 || col === BOARD_SIZE - 1;
  }

  /**
   * Static positional + mobility + stability evaluation from `player`'s view.
   */
  function evaluateBoard(board, player) {
    var opponent = -player;
    var positional = 0;
    var stability = 0;
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === player) {
          positional += WEIGHT_MATRIX[r][c];
          if (isEdgeOrCorner(r, c)) {
            stability += 10;
          }
        } else if (board[r][c] === opponent) {
          positional -= WEIGHT_MATRIX[r][c];
          if (isEdgeOrCorner(r, c)) {
            stability -= 10;
          }
        }
      }
    }
    var mobility = (getLegalMoves(board, player).length -
      getLegalMoves(board, opponent).length) * 5;
    return positional + mobility + stability;
  }

  /**
   * Easy AI: choose a uniformly random legal move.
   */
  function chooseMoveEasy(board, player) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    var index = Math.floor(Math.random() * moves.length);
    return moves[index];
  }

  /**
   * Normal AI: greedily choose the move with the best immediate weight value.
   */
  function chooseMoveNormal(board, player) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    var best = null;
    var bestValue = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var r = moves[i][0];
      var c = moves[i][1];
      var value = WEIGHT_MATRIX[r][c];
      if (value > bestValue) {
        bestValue = value;
        best = moves[i];
      }
    }
    return best;
  }

  /**
   * Minimax with alpha-beta pruning, evaluated from `rootPlayer`'s view.
   */
  function minimax(board, depth, alpha, beta, currentPlayer, rootPlayer) {
    if (depth === 0 || isGameOver(board)) {
      return evaluateBoard(board, rootPlayer);
    }
    var moves = getLegalMoves(board, currentPlayer);
    if (moves.length === 0) {
      // Current player must pass; control goes to the opponent.
      return minimax(board, depth, alpha, beta, -currentPlayer, rootPlayer);
    }
    var maximizing = currentPlayer === rootPlayer;
    var best = maximizing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var result = applyMove(board, moves[i][0], moves[i][1], currentPlayer);
      var value = minimax(result.board, depth - 1, alpha, beta,
        -currentPlayer, rootPlayer);
      if (maximizing) {
        if (value > best) {
          best = value;
        }
        if (best > alpha) {
          alpha = best;
        }
      } else {
        if (value < best) {
          best = value;
        }
        if (best < beta) {
          beta = best;
        }
      }
      if (beta <= alpha) {
        break;
      }
    }
    return best;
  }

  /**
   * Hard AI: alpha-beta minimax to a fixed depth.
   */
  function chooseMoveHard(board, player) {
    var moves = getLegalMoves(board, player);
    if (moves.length === 0) {
      return null;
    }
    var best = null;
    var bestValue = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var result = applyMove(board, moves[i][0], moves[i][1], player);
      var value = minimax(result.board, HARD_DEPTH - 1, -Infinity, Infinity,
        -player, player);
      if (value > bestValue) {
        bestValue = value;
        best = moves[i];
      }
    }
    return best;
  }

  /**
   * Choose an AI move at the given difficulty: 'easy', 'normal', or 'hard'.
   */
  function chooseAIMove(board, player, difficulty) {
    switch (difficulty) {
      case 'easy':
        return chooseMoveEasy(board, player);
      case 'normal':
        return chooseMoveNormal(board, player);
      case 'hard':
        return chooseMoveHard(board, player);
      default:
        return chooseMoveNormal(board, player);
    }
  }

  global.ReversiGame = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    DIRECTIONS: DIRECTIONS,
    WEIGHT_MATRIX: WEIGHT_MATRIX,
    HARD_DEPTH: HARD_DEPTH,
    createBoard: createBoard,
    cloneBoard: cloneBoard,
    isOnBoard: isOnBoard,
    getFlips: getFlips,
    isLegalMove: isLegalMove,
    getLegalMoves: getLegalMoves,
    applyMove: applyMove,
    getScore: getScore,
    isGameOver: isGameOver,
    getWinner: getWinner,
    getNextPlayer: getNextPlayer,
    evaluateBoard: evaluateBoard,
    chooseMoveEasy: chooseMoveEasy,
    chooseMoveNormal: chooseMoveNormal,
    chooseMoveHard: chooseMoveHard,
    chooseAIMove: chooseAIMove
  };
})(typeof window !== 'undefined' ? window : this);
