import dictionary from "./dictionary.json";
import targetWords from "./targetWords.json";

const WORD_LENGTH = 5;
const FLIP_ANIMATION_DURATION = 500;
const DANCE_ANIMATION_DURATION = 500;

const guessGrid: HTMLDivElement | null =
	document.querySelector("[data-guess-grid]");
const alertContainer: HTMLDivElement | null = document.querySelector(
	"[data-alert-container]"
);
const keyboard: HTMLDivElement | null =
	document.querySelector("[data-keyboard]");

if (!guessGrid || !alertContainer || !keyboard) errorResponse();

const offsetFromDate = new Date(2023, 0, 1);
const msOffset = Date.now() - offsetFromDate.getTime();
const dayOffset = msOffset / 1000 / 60 / 60 / 24;
const targetWord = targetWords[Math.floor(dayOffset)];

startInteraction();

function startInteraction() {
	document.addEventListener("click", handleMouseClick);
	document.addEventListener("keydown", handleKeyPress);
}

function stopInteraction() {
	document.removeEventListener("click", handleMouseClick);
	document.removeEventListener("keydown", handleKeyPress);
}

function handleMouseClick(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (target.matches("[data-key]")) {
		pressKey(target.dataset.key);
	} else if (target.matches("[data-enter]")) {
		submitGuess();
	} else if (target.matches("[data-delete]")) {
		deleteKey();
	} else return;
}

function handleKeyPress(event: KeyboardEvent) {
	if (event.key === "Enter") {
		submitGuess();
	} else if (event.key === "Backspace" || event.key === "Delete") {
		deleteKey();
	} else if (event.key.match(/^[a-z]$/)) {
		pressKey(event.key);
	} else return;
}

function pressKey(key: string | undefined) {
	if (!key) return;
	const activeTiles = getActiveTiles();
	if (activeTiles != null && activeTiles.length >= WORD_LENGTH) return;
	const nextTile: HTMLDivElement | null | undefined = guessGrid?.querySelector(
		":not([data-letter])"
	);
	if (!nextTile) return errorResponse();
	nextTile.dataset.letter = key.toLowerCase();
	nextTile.textContent = key;
	nextTile.dataset.state = "active";
}

function deleteKey() {
	const activeTiles = getActiveTiles();
	if (!activeTiles) return;
	const lastTile = activeTiles[activeTiles?.length - 1] as
		| HTMLDivElement
		| undefined;
	if (!lastTile) return;
	lastTile.textContent = "";
	delete lastTile.dataset.state;
	delete lastTile.dataset.letter;
}

function submitGuess() {
	const activeTilesOrUndefined = getActiveTiles();
	if (!activeTilesOrUndefined) return;
	const activeTiles = [...activeTilesOrUndefined] as HTMLDivElement[];
	if (activeTiles.length !== WORD_LENGTH) {
		showAlert("Not enough letters!");
		shakeTiles(activeTiles);
		return;
	}

	const guess = activeTiles.reduce((word, tile) => {
		return word + (tile.dataset.letter ?? "");
	}, "");

	if (!dictionary.includes(guess)) {
		showAlert("Not in word list!");
		shakeTiles(activeTiles);
		return;
	}

	stopInteraction();
	activeTiles.forEach((...params) => flipTile(...params, guess));
}

function flipTile(
	tile: HTMLDivElement,
	index: number,
	array: HTMLDivElement[],
	guess: string
) {
	const letter = tile.dataset.letter;
	if (!letter || letter === "") return;
	const key: HTMLButtonElement | null | undefined = keyboard?.querySelector(
		`[data-key="${letter}"i]`
	);
	if (!key) return errorResponse();
	setTimeout(
		() => tile.classList.add("flip"),
		(index * FLIP_ANIMATION_DURATION) / 2
	);

	tile.addEventListener(
		"transitionend",
		() => {
			tile.classList.remove("flip");
			if (targetWord[index] === letter) {
				tile.dataset.state = "correct";
				key.classList.add("correct");
			} else if (targetWord.includes(letter)) {
				tile.dataset.state = "wrong-location";
				key.classList.add("wrong-location");
			} else {
				tile.dataset.state = "wrong";
				key.classList.add("wrong");
			}

			if (index === array.length - 1) {
				tile.addEventListener(
					"transitionend",
					() => {
						startInteraction();
						checkWinLose(guess, array);
					},
					{ once: true }
				);
			}
		},
		{ once: true }
	);
}

function shakeTiles(tiles: HTMLDivElement[]) {
	tiles.forEach((tile) => {
		tile.classList.add("shake");
		tile.addEventListener(
			"animationend",
			() => tile.classList.remove("shake"),
			{ once: true }
		);
	});
}

function danceTiles(tiles: HTMLDivElement[]) {
	tiles.forEach((tile, index) => {
		setTimeout(() => {
			tile.classList.add("dance");
			tile.addEventListener(
				"animationend",
				() => tile.classList.remove("dance"),
				{ once: true }
			);
		}, (index * DANCE_ANIMATION_DURATION) / 5);
	});
}

function getActiveTiles() {
	return guessGrid?.querySelectorAll("[data-state='active']");
}

function showAlert(message: string, duration: number | null = 1000) {
	const alert = document.createElement("div");
	alert.textContent = message;
	alert.classList.add("alert");
	alertContainer?.prepend(alert);
	if (!duration) return;
	setTimeout(() => {
		alert.classList.add("hide");
		alert.addEventListener("transitionend", alert.remove);
	}, duration);
}

function errorResponse() {
	const errorMessage = "Something went wrong!";
	showAlert(errorMessage, null);
	stopInteraction();
	throw new Error(errorMessage);
}

function checkWinLose(guess: string, tiles: HTMLDivElement[]) {
	if (guess === targetWord) {
		showAlert("You won!", 5000);
		danceTiles(tiles);
		stopInteraction();
		return;
	}

	const remainingTiles: NodeListOf<HTMLDivElement> | undefined =
		guessGrid?.querySelectorAll(":not([data-letter])");
	if (!remainingTiles || remainingTiles.length === 0) {
		showAlert(`You lose! Target word: ${targetWord.toUpperCase()}`, null);
		stopInteraction();
	}
}
