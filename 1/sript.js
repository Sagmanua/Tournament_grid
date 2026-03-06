const container = document.getElementById('form-container');
const btn = document.getElementById('add-btn');

btn.addEventListener('click', () => {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = `<label>Name: </label><input type="text" class="name-input">`;
    container.appendChild(newDiv);
});

function generateTournament() {
  const inputs = document.querySelectorAll('.name-input');
  let names = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
  
  if (names.length < 2) {
    alert("Please enter at least 2 names!");
    return;
  }

  // Fisher-Yates Shuffle
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  let teams = [];
  for (let i = 0; i < names.length; i += 2) {
    let member1 = names[i];
    let member2 = names[i+1] || "BYE";
    teams.push(`${member1} & ${member2}`);
  }

  document.getElementById('bracket-container').innerHTML = "";
  createRound(teams);
}

// Global scope tracker for tournament progress
let currentRoundWinners = [];
let totalMatchesInRound = 0;
let matchesFinished = 0;

function createRound(teams) {
  const container = document.getElementById('bracket-container');
  const roundDiv = document.createElement('div');
  roundDiv.className = 'round';
  
  currentRoundWinners = [];
  totalMatchesInRound = Math.ceil(teams.length / 2);
  matchesFinished = 0;

  for (let i = 0; i < teams.length; i += 2) {
    const match = document.createElement('div');
    match.className = 'match';
    
    // Correctly define team1 and team2 before inserting into innerHTML
    const team1 = teams[i];
    const team2 = teams[i+1] || "BYE";

    match.innerHTML = `
      <div class="player" onclick="advance(event)">${team1}</div>
      <div class="player" onclick="advance(event)">${team2}</div>
    `;
    roundDiv.appendChild(match);
  }
  container.appendChild(roundDiv);
}

function advance(event) {
    const clickedPlayer = event.target;
    const matchContainer = clickedPlayer.parentElement;

    if (matchContainer.dataset.done === "true") return;

    matchContainer.dataset.done = "true";
    matchContainer.style.backgroundColor = "#c8e6c9";
    
    const winner = clickedPlayer.innerText;
    currentRoundWinners.push(winner);
    matchesFinished++;

    if (matchesFinished === totalMatchesInRound) {
        if (currentRoundWinners.length > 1) {
            createRound(currentRoundWinners);
        } else {
            alert("Tournament Winner: " + currentRoundWinners[0]);
        }
    }
}