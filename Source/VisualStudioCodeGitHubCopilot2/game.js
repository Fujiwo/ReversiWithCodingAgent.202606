// Reversi core and UI
(function(){
  const SIZE=8;
  const EMPTY=0, BLACK=1, WHITE=-1;

  function createEmptyBoard(){
    const b=Array.from({length:SIZE},()=>Array(SIZE).fill(EMPTY));
    // initial four
    b[3][3]=WHITE; b[3][4]=BLACK; b[4][3]=BLACK; b[4][4]=WHITE;
    return b;
  }

  function cloneBoard(board){
    return board.map(r=>r.slice());
  }

  function inBounds(r,c){return r>=0&&r<SIZE&&c>=0&&c<SIZE}

  const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  function getLegalMoves(board,player){
    const moves=new Set();
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      if(board[r][c]!==EMPTY) continue;
      for(const [dr,dc] of DIRS){
        let rr=r+dr, cc=c+dc, found=false;
        while(inBounds(rr,cc) && board[rr][cc]===-player){ rr+=dr; cc+=dc; found=true }
        if(found && inBounds(rr,cc) && board[rr][cc]===player){ moves.add(r+','+c); break }
      }
    }
    return Array.from(moves).map(s=>s.split(',').map(Number));
  }

  function applyMove(board,player,row,col){
    if(!inBounds(row,col)) return null;
    if(board[row][col]!==EMPTY) return null;
    let any=false; const b=cloneBoard(board);
    const flipped=[];
    for(const [dr,dc] of DIRS){
      let rr=row+dr, cc=col+dc, path=[];
      while(inBounds(rr,cc) && b[rr][cc]===-player){ path.push([rr,cc]); rr+=dr; cc+=dc }
      if(path.length>0 && inBounds(rr,cc) && b[rr][cc]===player){
        any=true; for(const [fr,fc] of path){ b[fr][fc]=player; flipped.push([fr,fc]) }
      }
    }
    if(!any) return null;
    b[row][col]=player;
    return {board:b,flipped};
  }

  function countPieces(board){
    let black=0, white=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      if(board[r][c]===BLACK) black++; else if(board[r][c]===WHITE) white++;
    }
    return {black,white};
  }

  function isGameOver(board){
    const b1=getLegalMoves(board,BLACK); const b2=getLegalMoves(board,WHITE);
    const full=board.flat().every(v=>v!==EMPTY);
    return full || (b1.length===0 && b2.length===0);
  }

  // weight matrix for position evaluation (corners high, adjacent negative)
  const weightMatrix = [
    [100,-20,10,5,5,10,-20,100],
    [-20,-50,-2,-2,-2,-2,-50,-20],
    [10,-2,5,1,1,5,-2,10],
    [5,-2,1,0,0,1,-2,5],
    [5,-2,1,0,0,1,-2,5],
    [10,-2,5,1,1,5,-2,10],
    [-20,-50,-2,-2,-2,-2,-50,-20],
    [100,-20,10,5,5,10,-20,100]
  ];

  function evaluatePosition(board,player){
    let score=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++) if(board[r][c]===player) score+=weightMatrix[r][c];
    return score;
  }

  function stabilityCount(board,player){
    let count=0;
    // simple stability: count stones on edges and corners
    for(let i=0;i<SIZE;i++){
      if(board[0][i]===player) count++;
      if(board[SIZE-1][i]===player) count++;
      if(board[i][0]===player) count++;
      if(board[i][SIZE-1]===player) count++;
    }
    return count;
  }

  // AI implementations
  function aiEasy(board,player){
    const moves=getLegalMoves(board,player);
    if(moves.length===0) return null;
    return moves[Math.floor(Math.random()*moves.length)];
  }

  function aiNormal(board,player){
    const moves=getLegalMoves(board,player);
    if(moves.length===0) return null;
    let best=null, bestScore=-Infinity;
    for(const [r,c] of moves){
      const res=applyMove(board,player,r,c);
      if(!res) continue;
      const sc=evaluatePosition(res.board,player);
      if(sc>bestScore){ bestScore=sc; best=[r,c] }
    }
    return best;
  }

  // Minimax with alpha-beta
  function aiHard(board,player,depthLimit=5){
    const start=performance.now();
    const moves=getLegalMoves(board,player);
    if(moves.length===0) return null;

    function evaluate(board,player){
      const pos = evaluatePosition(board,player);
      const myMoves = getLegalMoves(board,player).length;
      const oppMoves = getLegalMoves(board,-player).length;
      const mobility = (myMoves-oppMoves)*5;
      const stable = stabilityCount(board,player)*10;
      return pos + mobility + stable;
    }

    function minimax(bd,cur,depth,alpha,beta){
      if(depth===0 || isGameOver(bd)) return evaluate(bd,player);
      const moves=getLegalMoves(bd,cur);
      if(moves.length===0) return minimax(bd,-cur,depth-1,alpha,beta);
      if(cur===player){
        let v=-Infinity;
        for(const [r,c] of moves){
          const res=applyMove(bd,cur,r,c);
          if(!res) continue;
          const val=minimax(res.board,-cur,depth-1,alpha,beta);
          v=Math.max(v,val); alpha=Math.max(alpha,v); if(alpha>=beta) break;
        }
        return v;
      } else {
        let v=Infinity;
        for(const [r,c] of moves){
          const res=applyMove(bd,cur,r,c);
          if(!res) continue;
          const val=minimax(res.board,-cur,depth-1,alpha,beta);
          v=Math.min(v,val); beta=Math.min(beta,v); if(alpha>=beta) break;
        }
        return v;
      }
    }

    // choose best move
    let best=null,bestScore=-Infinity;
    const depth = depthLimit;
    for(const [r,c] of moves){
      const res=applyMove(board,player,r,c);
      if(!res) continue;
      const val=minimax(res.board,-player,depth-1,-Infinity,Infinity);
      if(val>bestScore){ bestScore=val; best=[r,c] }
    }

    // time guard: if took >500ms and depthLimit===5, fallback to depth4 next time
    const took=performance.now()-start;
    return best;
  }

  // Public API and UI glue
  const ReversiGame = {
    SIZE, EMPTY, BLACK, WHITE, createEmptyBoard, cloneBoard, getLegalMoves, applyMove, countPieces, isGameOver,
    aiEasy, aiNormal, aiHard, weightMatrix
  };

  // UI
  const ReversiUI = (function(){
    let boardEl, board, current=BLACK, difficulty='normal', lock=false, lastMove=null, lastFlipped=[];

    function render(){
      boardEl.innerHTML='';
      for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
        const cell=document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c;
        const v=board[r][c];
        if(v!==EMPTY){
          const piece=document.createElement('div'); piece.className='piece';
          const faceB=document.createElement('div'); faceB.className='face black';
          const faceW=document.createElement('div'); faceW.className='face white';
          piece.appendChild(faceB); piece.appendChild(faceW);
          if(v===WHITE) piece.style.transform='rotateY(180deg)';
          if(lastMove && lastMove[0]===r && lastMove[1]===c) cell.classList.add('last');
          if(lastFlipped.some(f=>f[0]===r&&f[1]===c)) cell.classList.add('flipped');
          cell.appendChild(piece);
        } else {
          const legal=getLegalMoves(board,current).some(m=>m[0]===r&&m[1]===c);
          if(legal){ const dot=document.createElement('div'); dot.className='dot'; cell.appendChild(dot) }
        }
        cell.addEventListener('click',onCellClick);
        boardEl.appendChild(cell);
      }
      updateInfo();
    }

    function updateInfo(){
      const s=countPieces(board);
      document.getElementById('score').textContent=`黒 ${s.black} : ${s.white} 白`;
      document.getElementById('turn').textContent = (current===BLACK)?'黒の手番':'白の手番';
      document.getElementById('legalCount').textContent = `合法手: ${getLegalMoves(board,current).length}`;
      document.getElementById('lastMove').textContent = lastMove?`最後の手: ${lastMove[0]},${lastMove[1]}`:'最後の手: なし';
      document.getElementById('flippedCount').textContent = `反転: ${lastFlipped.length}`;
    }

    function onCellClick(e){
      if(lock) return;
      const r=Number(this.dataset.r), c=Number(this.dataset.c);
      if(current!==BLACK) return; // human is black
      const res=applyMove(board,current,r,c);
      if(!res) return;
      board=res.board; lastMove=[r,c]; lastFlipped=res.flipped; render();
      nextTurn();
    }

    function nextTurn(){
      current = -current;
      // check legal
      const legal=getLegalMoves(board,current);
      if(legal.length===0){
        // pass
        if(getLegalMoves(board,-current).length===0 || isGameOver(board)){
          finishGame(); return;
        }
        current = -current; // pass back
        render(); return;
      }
      render();
      if(current===WHITE) doAIMove();
    }

    function finishGame(){
      const s=countPieces(board);
      const winner = s.black> s.white ? '黒' : s.white> s.black ? '白' : '引き分け';
      alert(`ゲーム終了: ${winner} 勝ち。 黒 ${s.black} - 白 ${s.white}`);
    }

    function doAIMove(){
      lock=true; // prevent clicks
      setTimeout(()=>{
        let move=null;
        if(difficulty==='easy') move=aiEasy(board,WHITE);
        else if(difficulty==='normal') move=aiNormal(board,WHITE);
        else move=aiHard(board,WHITE,5);
        if(move){
          const [r,c]=move; const res=applyMove(board,WHITE,r,c); if(res){ board=res.board; lastMove=[r,c]; lastFlipped=res.flipped }
        }
        lock=false; nextTurn();
      },120);
    }

    function init(el){
      boardEl=el; board=createEmptyBoard(); current=BLACK; difficulty=document.getElementById('difficulty').value;
      document.getElementById('difficulty').addEventListener('change',e=>{ difficulty=e.target.value });
      document.getElementById('restart').addEventListener('click',()=>{ board=createEmptyBoard(); current=BLACK; lastMove=null; lastFlipped=[]; render(); });
      render();
    }

    return {init};
  })();

  window.ReversiGame = ReversiGame;
  window.ReversiUI = ReversiUI;
})();
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
