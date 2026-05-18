import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import questionsData from "./questions.json";
import "./styles.css";

type Topic = "history" | "chemistry" | "geometry";
type PlayerId = "A" | "B";
type GameMode = "two-player" | "bot";

type GraphPoint = {
  x: number;
  y: number;
  label?: string;
};

type GraphLine = {
  slope: number;
  intercept: number;
  label?: string;
};

type GraphSpec = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  points?: GraphPoint[];
  lines?: GraphLine[];
};

type Question = {
  id: string;
  topic: Topic;
  unit: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
  graph?: GraphSpec;
};

type PendingMove = {
  from: Square;
  to: Square;
  promotion?: "q";
  player: PlayerId;
};

type QuizState = {
  question: Question;
  player: PlayerId;
  retry: boolean;
  selectedAnswer: number | null;
  result: "pending" | "correct" | "wrong";
};

type PlayerState = {
  topic: Topic | null;
  missedIds: string[];
  askedIds: string[];
  correct: number;
  wrong: number;
};

type CaldiExpression = "happy" | "smirk" | "thinking" | "worried" | "angry" | "furious" | "shocked";
type CaldiEvent =
  | "intro"
  | "player-capture-pawn"
  | "player-capture"
  | "caldi-capture-pawn"
  | "caldi-capture"
  | "even-pawn-exchange"
  | "caldi-in-check"
  | "caldi-queen-taken"
  | "caldi-checkmates"
  | "caldi-loses"
  | "caldi-move"
  | "player-correct"
  | "player-wrong";

type CaldiLine = {
  expression: CaldiExpression;
  line: string;
};

type CaldiState = CaldiLine & {
  eventKey: string;
};

type RecentHumanCapture = {
  captured: PieceSymbol;
  moveNumber: number;
};

const topics: Record<Topic, { label: string; short: string; accent: string }> = {
  history: { label: "US History", short: "History", accent: "#3fb4e8" },
  chemistry: { label: "Chemistry", short: "Chem", accent: "#33c7b6" },
  geometry: { label: "Geometry Algebra", short: "Algebra", accent: "#f6ca3f" },
};

const pieceGlyphs: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const pieceNames: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
const caldiSprites: Record<CaldiExpression, string> = {
  angry: new URL("../caldi/CaldiAngry.png", import.meta.url).href,
  furious: new URL("../caldi/CaldiFurious.png", import.meta.url).href,
  happy: new URL("../caldi/CaldiHappy.png", import.meta.url).href,
  shocked: new URL("../caldi/CaldiShocked.png", import.meta.url).href,
  smirk: new URL("../caldi/CaldiSmirk.png", import.meta.url).href,
  thinking: new URL("../caldi/CaldiThinking.png", import.meta.url).href,
  worried: new URL("../caldi/CaldiWorried.png", import.meta.url).href,
};
const caldiDialogue: Record<CaldiEvent, CaldiLine[]> = {
  intro: [
    { expression: "smirk", line: "I hope you brought notes. I brought a whole monarchy." },
    { expression: "happy", line: "Solo mode? Excellent. I was getting tired of mercy." },
    { expression: "thinking", line: "Chess first, exams second, emotional damage somewhere in the middle." },
    { expression: "smirk", line: "Try not to make this too educational for me." },
  ],
  "player-capture-pawn": [
    { expression: "thinking", line: "Just remember, you took it there." },
    { expression: "smirk", line: "A pawn? Bold. Economical. Slightly rude." },
    { expression: "angry", line: "That pawn had homework due tomorrow." },
    { expression: "worried", line: "I was using that one as emotional support." },
  ],
  "player-capture": [
    { expression: "angry", line: "At least I still have my good looks." },
    { expression: "furious", line: "That was not in my study guide." },
    { expression: "thinking", line: "Interesting. Incorrect emotionally, but interesting." },
    { expression: "smirk", line: "Material is temporary. Style is forever." },
  ],
  "caldi-capture-pawn": [
    { expression: "smirk", line: "Mind if I borrow that?" },
    { expression: "happy", line: "Tiny snack. Very crunchy." },
    { expression: "thinking", line: "Pawn removed for academic review." },
    { expression: "smirk", line: "That one was standing suspiciously." },
  ],
  "caldi-capture": [
    { expression: "happy", line: "And I will be taking attendance." },
    { expression: "smirk", line: "I call that a practical demonstration." },
    { expression: "angry", line: "You left it there. I merely believed you." },
    { expression: "thinking", line: "A clean capture. Put that in the notes." },
  ],
  "even-pawn-exchange": [
    { expression: "smirk", line: "Go easy on them Caldi. Well... not TOO easy." },
    { expression: "thinking", line: "Even exchange." },
    { expression: "happy", line: "A pawn for a pawn. We are practically accountants." },
    { expression: "smirk", line: "Symmetry. Suspicious, but elegant." },
  ],
  "caldi-in-check": [
    { expression: "angry", line: "Is that supposed to scare me?" },
    { expression: "worried", line: "The monarchy is under threat." },
    { expression: "furious", line: "This is a constitutional crisis." },
    { expression: "thinking", line: "Check? Cute. Temporary, but cute." },
  ],
  "caldi-queen-taken": [
    { expression: "shocked", line: "OH QUEEN." },
    { expression: "worried", line: "Her reign has ended." },
    { expression: "furious", line: "That was extremely illegal in spirit." },
    { expression: "shocked", line: "Someone lower the flags on the study hall." },
  ],
  "caldi-checkmates": [
    { expression: "shocked", line: "I... Have made a checkmate monster..." },
    { expression: "happy", line: "Checkmate. And yes, that will be on the final." },
    { expression: "smirk", line: "The lesson was consequences." },
    { expression: "furious", line: "Victory! Somebody grade that with a red pen." },
  ],
  "caldi-loses": [
    { expression: "shocked", line: "This is academically devastating." },
    { expression: "worried", line: "I request a retake. For, uh, no reason." },
    { expression: "furious", line: "Impossible. I was at least 62% prepared." },
    { expression: "shocked", line: "The final boss has become the final example." },
  ],
  "caldi-move": [
    { expression: "thinking", line: "I have moved. The board is now more dramatic." },
    { expression: "smirk", line: "A little pressure keeps the brain awake." },
    { expression: "happy", line: "Your turn. Try something exammiest." },
    { expression: "thinking", line: "This is strategy. Or theater. Usually both." },
  ],
  "player-correct": [
    { expression: "thinking", line: "Correct. Disturbing, but correct." },
    { expression: "smirk", line: "Fine. The move has academic clearance." },
    { expression: "happy", line: "Look at you, weaponizing knowledge." },
    { expression: "thinking", line: "A right answer and a legal move. Dangerous combo." },
  ],
  "player-wrong": [
    { expression: "smirk", line: "Incorrect, but with confidence. Classic." },
    { expression: "thinking", line: "The board rejects your thesis." },
    { expression: "happy", line: "No move for you. The exam intercepted that one." },
    { expression: "angry", line: "Study first. Shenanigans second." },
  ],
};
const questions = questionsData as Question[];
const questionsByTopic = questions.reduce<Record<Topic, Question[]>>(
  (grouped, question) => {
    grouped[question.topic].push(question);
    return grouped;
  },
  { history: [], chemistry: [], geometry: [] },
);

let chess = new Chess();
let mode: GameMode = "two-player";
let gameStarted = false;
let selectedSquare: Square | null = null;
let legalTargets = new Set<Square>();
let pendingMove: PendingMove | null = null;
let quiz: QuizState | null = null;
let topicPickerFor: PlayerId | null = null;
let statusText = "Choose a mode, then start jamming.";
let caldiEventCounter = 0;
let caldiState: CaldiState = makeCaldiState("intro");
let recentHumanCapture: RecentHumanCapture | null = null;

const players: Record<PlayerId, PlayerState> = {
  A: { topic: null, missedIds: [], askedIds: [], correct: 0, wrong: 0 },
  B: { topic: null, missedIds: [], askedIds: [], correct: 0, wrong: 0 },
};

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Missing #app root.");
}

const app = appElement;

function currentPlayer(): PlayerId {
  return chess.turn() === "w" ? "A" : "B";
}

function makeCaldiState(event: CaldiEvent): CaldiState {
  const options = caldiDialogue[event];
  const picked = options[Math.floor(Math.random() * options.length)] ?? options[0];
  caldiEventCounter += 1;
  return {
    ...picked,
    eventKey: `${event}-${caldiEventCounter}`,
  };
}

function speakAsCaldi(event: CaldiEvent): void {
  if (mode === "bot") {
    caldiState = makeCaldiState(event);
  }
}

function playerName(player: PlayerId): string {
  if (mode === "bot" && player === "B") return "Caldi";
  return `Player ${player}`;
}

function startGame(nextMode: GameMode): void {
  chess = new Chess();
  mode = nextMode;
  gameStarted = true;
  selectedSquare = null;
  legalTargets = new Set();
  pendingMove = null;
  quiz = null;
  topicPickerFor = null;
  recentHumanCapture = null;
  caldiState = makeCaldiState("intro");
  statusText = "Player A, make your opening move.";
  resetPlayer("A");
  resetPlayer("B");
  render();
}

function resetPlayer(player: PlayerId): void {
  players[player].topic = null;
  players[player].missedIds = [];
  players[player].askedIds = [];
  players[player].correct = 0;
  players[player].wrong = 0;
}

function resetMatch(): void {
  startGame(mode);
}

function getSquare(row: number, col: number): Square {
  return `${files[col]}${ranks[row]}` as Square;
}

function getPieceAt(square: Square) {
  return chess.get(square);
}

function isBotTurn(): boolean {
  return gameStarted && mode === "bot" && currentPlayer() === "B" && !chess.isGameOver();
}

function movesFrom(square: Square) {
  return chess.moves({ square, verbose: true });
}

function clearSelection(): void {
  selectedSquare = null;
  legalTargets = new Set();
}

function handleSquare(square: Square): void {
  if (!gameStarted || quiz || topicPickerFor || isBotTurn() || chess.isGameOver()) return;

  const piece = getPieceAt(square);
  const turnColor = chess.turn();

  if (!selectedSquare) {
    if (piece?.color === turnColor) {
      selectedSquare = square;
      legalTargets = new Set(movesFrom(square).map((move) => move.to as Square));
      statusText = `${playerName(currentPlayer())}: choose a destination.`;
      render();
    }
    return;
  }

  if (selectedSquare === square) {
    clearSelection();
    statusText = `${playerName(currentPlayer())}: pick a piece.`;
    render();
    return;
  }

  if (piece?.color === turnColor) {
    selectedSquare = square;
    legalTargets = new Set(movesFrom(square).map((move) => move.to as Square));
    statusText = `${playerName(currentPlayer())}: choose a destination.`;
    render();
    return;
  }

  const legalMove = movesFrom(selectedSquare).find((move) => move.to === square);
  if (!legalMove) {
    statusText = "That move is not legal. Pick another square.";
    render();
    return;
  }

  pendingMove = {
    from: selectedSquare,
    to: square,
    promotion: legalMove.flags.includes("p") ? "q" : undefined,
    player: currentPlayer(),
  };

  if (!players[pendingMove.player].topic) {
    topicPickerFor = pendingMove.player;
    statusText = `${playerName(pendingMove.player)} chooses a study topic first.`;
  } else {
    openQuestionForPendingMove();
  }
  render();
}

function chooseTopic(topic: Topic): void {
  if (!topicPickerFor) return;
  players[topicPickerFor].topic = topic;
  statusText = `${playerName(topicPickerFor)} chose ${topics[topic].label}.`;
  topicPickerFor = null;

  if (pendingMove) {
    openQuestionForPendingMove();
  }
  render();
}

function openQuestionForPendingMove(): void {
  if (!pendingMove) return;
  const picked = pickQuestion(pendingMove.player);
  quiz = {
    question: picked.question,
    retry: picked.retry,
    player: pendingMove.player,
    selectedAnswer: null,
    result: "pending",
  };
}

function pickQuestion(player: PlayerId): { question: Question; retry: boolean } {
  const playerState = players[player];
  const topic = playerState.topic ?? "geometry";
  const missed = playerState.missedIds[0];

  if (missed) {
    const retryQuestion = questions.find((question) => question.id === missed);
    if (retryQuestion) return { question: retryQuestion, retry: true };
  }

  const bank = questionsByTopic[topic];
  const available = bank.filter((question) => !playerState.missedIds.includes(question.id));
  const pool = available.length ? available : bank;
  const unanswered = pool.filter((question) => !playerState.askedIds.includes(question.id));
  const source = unanswered.length ? unanswered : pool;
  const question = source[Math.floor(Math.random() * source.length)];

  if (!question) {
    throw new Error(`No questions available for topic ${topic}.`);
  }

  playerState.askedIds.push(question.id);
  if (playerState.askedIds.length > bank.length * 2) {
    playerState.askedIds = playerState.askedIds.slice(-bank.length);
  }

  return { question, retry: false };
}

function answerQuestion(answerIndex: number): void {
  if (!quiz || quiz.result !== "pending") return;
  quiz.selectedAnswer = answerIndex;

  if (answerIndex === quiz.question.answerIndex) {
    quiz.result = "correct";
    players[quiz.player].correct += 1;
    removeMissed(quiz.player, quiz.question.id);
    statusText = "Correct. Review the answer, then continue to lock in the move.";
    render();
    return;
  }

  quiz.result = "wrong";
  players[quiz.player].wrong += 1;
  addMissed(quiz.player, quiz.question.id);
  statusText = "Wrong answer. Review it, then continue to pass the turn.";
  render();
}

function continueAfterAnswer(): void {
  if (!quiz || quiz.result === "pending") return;

  if (quiz.result === "correct") {
    commitPendingMove();
    return;
  }

  cancelPendingMoveAndPass();
}

function addMissed(player: PlayerId, questionId: string): void {
  if (!players[player].missedIds.includes(questionId)) {
    players[player].missedIds.push(questionId);
  }
}

function removeMissed(player: PlayerId, questionId: string): void {
  players[player].missedIds = players[player].missedIds.filter((id) => id !== questionId);
}

function commitPendingMove(): void {
  if (!pendingMove) return;
  const movingPlayer = pendingMove.player;
  let committedMove: Move | null = null;

  try {
    committedMove = chess.move({
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: pendingMove.promotion,
    });
  } catch {
    statusText = "That move could not be applied. Try another move.";
  }

  pendingMove = null;
  quiz = null;
  clearSelection();
  updateGameStatus();
  if (mode === "bot" && committedMove && movingPlayer === "A") {
    reactToHumanMove(committedMove);
  }
  render();

  if (isBotTurn()) {
    window.setTimeout(makeBotMove, 500);
  }
}

function cancelPendingMoveAndPass(): void {
  const cancelledPlayer = pendingMove?.player ?? null;
  if (pendingMove) {
    try {
      chess.load(passTurnFen(chess.fen()));
    } catch {
      statusText = "Move cancelled. Check must be answered before the turn can pass.";
    }
  }

  pendingMove = null;
  quiz = null;
  clearSelection();
  updateGameStatus();
  if (mode === "bot" && cancelledPlayer === "A") {
    speakAsCaldi("player-wrong");
  }
  render();

  if (isBotTurn()) {
    window.setTimeout(makeBotMove, 500);
  }
}

function passTurnFen(fen: string): string {
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  parts[4] = "0";
  return parts.join(" ");
}

function makeBotMove(): void {
  if (!isBotTurn()) return;

  const move = chooseBotMove();
  if (!move) return;

  const committedMove = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
  statusText = `Caldi played ${committedMove.san}.`;
  updateGameStatus();
  reactToCaldiMove(committedMove);
  render();
}

function chooseBotMove(): Move | undefined {
  const legalMoves = chess.moves({ verbose: true });
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

  const scored = legalMoves.map((move) => {
    let score = Math.random();
    if (move.san.includes("#")) score += 1000;
    if (move.captured) score += 20 + pieceValues[move.captured];
    if (move.san.includes("+")) score += 10;
    if (move.promotion) score += 8;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.move;
}

function reactToHumanMove(move: Move): void {
  recentHumanCapture = move.captured
    ? {
        captured: move.captured,
        moveNumber: chess.history().length,
      }
    : null;

  if (chess.isCheckmate()) {
    speakAsCaldi("caldi-loses");
    return;
  }

  if (move.captured === "q") {
    speakAsCaldi("caldi-queen-taken");
    return;
  }

  if (chess.isCheck()) {
    speakAsCaldi("caldi-in-check");
    return;
  }

  if (move.captured === "p") {
    speakAsCaldi("player-capture-pawn");
    return;
  }

  if (move.captured) {
    speakAsCaldi("player-capture");
    return;
  }

  speakAsCaldi("player-correct");
}

function reactToCaldiMove(move: Move): void {
  const botMoveNumber = chess.history().length;
  const evenPawnExchange =
    move.captured === "p" &&
    recentHumanCapture?.captured === "p" &&
    botMoveNumber - recentHumanCapture.moveNumber === 1;

  if (chess.isCheckmate()) {
    speakAsCaldi("caldi-checkmates");
  } else if (evenPawnExchange) {
    speakAsCaldi("even-pawn-exchange");
  } else if (move.captured === "p") {
    speakAsCaldi("caldi-capture-pawn");
  } else if (move.captured) {
    speakAsCaldi("caldi-capture");
  } else {
    speakAsCaldi("caldi-move");
  }

  recentHumanCapture = null;
}

function updateGameStatus(): void {
  if (chess.isCheckmate()) {
    statusText = `Checkmate. ${playerName(currentPlayer() === "A" ? "B" : "A")} wins.`;
  } else if (chess.isDraw()) {
    statusText = "Draw. The jam ends level.";
  } else if (chess.isCheck()) {
    statusText = `${playerName(currentPlayer())} is in check.`;
  } else {
    statusText = `${playerName(currentPlayer())}'s turn.`;
  }
}

function render(): void {
  app.innerHTML = `
    <main class="shell ${gameStarted ? "is-playing" : "is-setup"}">
      ${renderSetup()}
      ${renderPlayerPanel("B")}
      <section class="table">
        <div class="brand-row">
          <div>
            <p class="eyebrow">Exam Jam Chess</p>
            <h1>The exammiest, jammiest game around!</h1>
          </div>
          <button class="icon-button" data-action="reset" aria-label="Reset match" title="Reset match">↻</button>
        </div>
        <div class="status-strip">
          <span>${statusText}</span>
          <span>${mode === "bot" ? "1P vs Caldi" : "Face-to-face 2P"}</span>
        </div>
        ${renderCaldi()}
        ${renderBoard()}
      </section>
      ${renderPlayerPanel("A")}
      ${renderTopicModal()}
      ${renderQuestionModal()}
    </main>
  `;

  bindEvents();
}

function renderSetup(): string {
  if (gameStarted) return "";
  return `
    <section class="setup-screen">
      <div class="setup-copy">
        <p class="eyebrow">Study by earning every move</p>
        <h2>Exam Jam Chess</h2>
        <p>Play chess across a tablet. Every move needs a correct answer in history, chemistry, or geometry algebra.</p>
      </div>
      <div class="mode-grid">
        <button class="mode-card" data-start="two-player">
          <span class="mode-icon">♔♚</span>
          <strong>2 Players</strong>
          <small>Face-to-face tablet battle</small>
        </button>
        <button class="mode-card" data-start="bot">
          <span class="mode-icon">♘⚙</span>
          <strong>1 Player vs Caldi</strong>
          <small>Practice against the dramatic chess tutor</small>
        </button>
      </div>
    </section>
  `;
}

function renderPlayerPanel(player: PlayerId): string {
  const playerState = players[player];
  const topic = playerState.topic ? topics[playerState.topic] : null;
  const active = gameStarted && currentPlayer() === player && !chess.isGameOver();
  const classes = ["player-panel", `player-${player.toLowerCase()}`, active ? "is-active" : ""].join(" ");

  return `
    <aside class="${classes}">
      <div>
        <p class="panel-kicker">${playerName(player)}</p>
        <h2>${player === "A" ? "White" : mode === "bot" ? "Caldi Black" : "Black"}</h2>
      </div>
      <div class="topic-pill" style="--topic: ${topic?.accent ?? "#9aa6b6"}">
        ${topic ? topic.label : player === "B" && mode === "bot" ? "Caldi answers with chess" : "Pick topic on first move"}
      </div>
      <div class="score-row">
        <span><strong>${playerState.correct}</strong> right</span>
        <span><strong>${playerState.wrong}</strong> wrong</span>
        <span><strong>${playerState.missedIds.length}</strong> retry</span>
      </div>
    </aside>
  `;
}

function renderCaldi(): string {
  if (!gameStarted || mode !== "bot") return "";

  return `
    <section class="caldi-stage" aria-label="Caldi opponent">
      <div class="caldi-portrait-frame">
        <img
          class="caldi-portrait"
          src="${caldiSprites[caldiState.expression]}"
          alt="Caldi ${caldiState.expression}"
        />
      </div>
      <p class="caldi-speech" data-event="${caldiState.eventKey}">
        <span>Caldi</span>
        ${caldiState.line}
      </p>
    </section>
  `;
}

function renderBoard(): string {
  const board = chess.board();
  const lastMove = pendingMove;

  return `
    <div class="board-wrap" aria-label="Chess board">
      <div class="board">
        ${board
          .map((row, rowIndex) =>
            row
              .map((piece, colIndex) => {
                const square = getSquare(rowIndex, colIndex);
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const selected = selectedSquare === square;
                const target = legalTargets.has(square);
                const pending = lastMove && (lastMove.from === square || lastMove.to === square);
                const label = piece
                  ? `${square}, ${piece.color === "w" ? "white" : "black"} ${pieceNames[piece.type]}`
                  : `${square}, empty`;
                return `
                  <button
                    class="square ${isLight ? "light" : "dark"} ${selected ? "selected" : ""} ${target ? "target" : ""} ${pending ? "pending" : ""}"
                    data-square="${square}"
                    aria-label="${label}"
                  >
                    <span class="coord file">${rowIndex === 7 ? files[colIndex] : ""}</span>
                    <span class="coord rank">${colIndex === 0 ? ranks[rowIndex] : ""}</span>
                    <span class="piece ${piece?.color === "b" ? "black-piece" : "white-piece"}">
                      ${piece ? pieceGlyphs[piece.color][piece.type] : ""}
                    </span>
                  </button>
                `;
              })
              .join(""),
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderTopicModal(): string {
  if (!topicPickerFor) return "";

  return `
    <div class="modal-backdrop">
      <section class="modal topic-modal ${topicPickerFor === "B" && mode !== "bot" ? "rotate-b" : ""}" role="dialog" aria-modal="true">
        <p class="eyebrow">${playerName(topicPickerFor)} first move</p>
        <h2>Choose your study jam</h2>
        <div class="topic-grid">
          ${(Object.keys(topics) as Topic[])
            .map(
              (topic) => `
                <button class="topic-choice" data-topic="${topic}" style="--topic: ${topics[topic].accent}">
                  <strong>${topics[topic].label}</strong>
                  <span>${topicDescription(topic)}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function topicDescription(topic: Topic): string {
  if (topic === "history") return "Cold War, Civil Rights, Vietnam, Modern America";
  if (topic === "chemistry") return "Moles, reactions, bonding, stoichiometry";
  return "Equations, slope, systems, functions, graphs";
}

function renderQuestionModal(): string {
  if (!quiz) return "";
  const activeQuiz = quiz;
  const { question } = activeQuiz;
  const topic = topics[question.topic];
  const current = players[activeQuiz.player];

  return `
    <div class="modal-backdrop">
      <section class="modal question-modal ${activeQuiz.player === "B" && mode !== "bot" ? "rotate-b" : ""}" role="dialog" aria-modal="true">
        <div class="question-topline">
          <span class="topic-pill compact" style="--topic: ${topic.accent}">${topic.short}</span>
          ${activeQuiz.retry ? `<span class="retry-chip">Let's try again</span>` : ""}
          <span>${playerName(activeQuiz.player)}</span>
        </div>
        <p class="unit-label">${question.unit}</p>
        <h2>${question.prompt}</h2>
        ${question.graph ? renderGraph(question.graph) : ""}
        <div class="answers">
          ${question.choices
            .map((choice, index) => {
              const selected = activeQuiz.selectedAnswer === index;
              const correct = activeQuiz.result !== "pending" && index === question.answerIndex;
              const wrong = selected && activeQuiz.result === "wrong";
              return `
                <button class="answer ${selected ? "selected-answer" : ""} ${correct ? "correct-answer" : ""} ${wrong ? "wrong-answer" : ""}" data-answer="${index}" ${activeQuiz.result !== "pending" ? "disabled" : ""}>
                  <span>${String.fromCharCode(65 + index)}</span>
                  ${choice}
                </button>
              `;
            })
            .join("")}
        </div>
        ${
          activeQuiz.result !== "pending"
            ? `
              <div class="answer-review ${activeQuiz.result === "correct" ? "is-correct" : "is-wrong"}">
                <strong>${activeQuiz.result === "correct" ? "Correct" : "Not quite"}</strong>
                <p>${question.explanation ?? "Review the highlighted answer before moving on."}</p>
              </div>
              <button class="continue-button" data-action="continue-answer">
                ${activeQuiz.result === "correct" ? "Lock in move" : "Pass turn"}
              </button>
            `
            : ""
        }
        <p class="question-foot">${current.missedIds.length} retry ${current.missedIds.length === 1 ? "card" : "cards"} waiting</p>
      </section>
    </div>
  `;
}

function renderGraph(graph: GraphSpec): string {
  const width = 420;
  const height = 260;
  const pad = 32;
  const xScale = (x: number) => pad + ((x - graph.xMin) / (graph.xMax - graph.xMin)) * (width - pad * 2);
  const yScale = (y: number) => height - pad - ((y - graph.yMin) / (graph.yMax - graph.yMin)) * (height - pad * 2);
  const xAxis = graph.yMin <= 0 && graph.yMax >= 0 ? yScale(0) : height - pad;
  const yAxis = graph.xMin <= 0 && graph.xMax >= 0 ? xScale(0) : pad;
  const verticalTicks = [];
  const horizontalTicks = [];

  for (let x = Math.ceil(graph.xMin); x <= Math.floor(graph.xMax); x += 1) {
    verticalTicks.push(`<line x1="${xScale(x)}" y1="${pad}" x2="${xScale(x)}" y2="${height - pad}" />`);
  }
  for (let y = Math.ceil(graph.yMin); y <= Math.floor(graph.yMax); y += 1) {
    horizontalTicks.push(`<line x1="${pad}" y1="${yScale(y)}" x2="${width - pad}" y2="${yScale(y)}" />`);
  }

  const lines = (graph.lines ?? [])
    .map((line, index) => {
      const x1 = graph.xMin;
      const x2 = graph.xMax;
      const y1 = line.slope * x1 + line.intercept;
      const y2 = line.slope * x2 + line.intercept;
      return `<line class="graph-line line-${index}" x1="${xScale(x1)}" y1="${yScale(y1)}" x2="${xScale(x2)}" y2="${yScale(y2)}" />`;
    })
    .join("");

  const points = (graph.points ?? [])
    .map(
      (point) => `
        <g class="graph-point">
          <circle cx="${xScale(point.x)}" cy="${yScale(point.y)}" r="5" />
          ${point.label ? `<text x="${xScale(point.x) + 8}" y="${yScale(point.y) - 8}">${point.label}</text>` : ""}
        </g>
      `,
    )
    .join("");

  return `
    <figure class="graph-card">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Coordinate graph">
        <g class="grid-lines">${verticalTicks.join("")}${horizontalTicks.join("")}</g>
        <line class="axis" x1="${pad}" y1="${xAxis}" x2="${width - pad}" y2="${xAxis}" />
        <line class="axis" x1="${yAxis}" y1="${pad}" x2="${yAxis}" y2="${height - pad}" />
        ${lines}
        ${points}
      </svg>
    </figure>
  `;
}

function bindEvents(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-start]").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.start as GameMode));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-square]").forEach((button) => {
    button.addEventListener("click", () => handleSquare(button.dataset.square as Square));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => chooseTopic(button.dataset.topic as Topic));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(Number(button.dataset.answer)));
  });

  app.querySelector<HTMLButtonElement>("[data-action='reset']")?.addEventListener("click", resetMatch);
  app
    .querySelector<HTMLButtonElement>("[data-action='continue-answer']")
    ?.addEventListener("click", continueAfterAnswer);
}

render();
