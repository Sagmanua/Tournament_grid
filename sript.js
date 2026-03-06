const container = document.getElementById('form-container');
const btn = document.getElementById('add-btn');

btn.addEventListener('click', () => {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = `<label>Name: </label><input type="text" class="name-input">`;
    container.appendChild(newDiv);
    updatePlayerCount(); 
});

let remainingNames = [];
let draftedOrder = []; 
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let ctx;

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

function startDraft() {
    const inputs = document.querySelectorAll('.name-input');
    const teamSize = parseInt(document.getElementById('team-size').value);
    remainingNames = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
    
    // Check if total players are divisible by the chosen team size
    if (remainingNames.length < teamSize || remainingNames.length % teamSize !== 0) {
        alert(`Please enter a number of names divisible by ${teamSize} (Total: ${remainingNames.length})`);
        return;
    }

    draftedOrder = [];
    document.getElementById('draft-board').innerHTML = "<strong>Drafted Teams:</strong>";
    document.getElementById('bracket-container').innerHTML = "";
    document.getElementById('roulette-container').style.display = "block";
    
    processNext();
}

function processNext() {
    if (remainingNames.length > 0) {
        setupWheel(remainingNames);
        spin(remainingNames);
    } else {
        document.getElementById('roulette-container').style.display = "none";
        finalizeTournament(draftedOrder);
    }
}

function setupWheel(names) {
    const canvas = document.getElementById("wheelCanvas");
    ctx = canvas.getContext("2d");
    arc = Math.PI * 2 / names.length;
    drawRouletteWheel(names);
}

function drawRouletteWheel(names) {
    ctx.clearRect(0, 0, 400, 400);
    
    const outsideRadius = 180;
    const textRadius = 140;

    for(let i = 0; i < names.length; i++) {
        const angle = startAngle + i * arc;

        const hue = (i * (360 / names.length));
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        
        ctx.beginPath();
        ctx.arc(200, 200, outsideRadius, angle, angle + arc, false);
        ctx.lineTo(200, 200);
        ctx.fill();
        ctx.stroke(); 

        ctx.save();
        ctx.fillStyle = "white"; 
        ctx.font = "bold 14px Arial";
        ctx.translate(200 + Math.cos(angle + arc / 2) * textRadius, 
                      200 + Math.sin(angle + arc / 2) * textRadius);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        ctx.fillText(names[i], -ctx.measureText(names[i]).width / 2, 0);
        ctx.restore();
    }


ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(400, 190); 
    ctx.lineTo(400, 210); 
    ctx.lineTo(380, 200); 
    ctx.fill();
}

function spin(names) {
    let spinAngleStart = Math.random() * 10 + 10;
    let spinTime = 0;
    let spinTimeTotal = 2000;
    function rotateWheel() {
        spinTime += 30;
        if(spinTime >= spinTimeTotal) { stopRotate(names); return; }
        startAngle += (spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal)) * Math.PI / 180;
        drawRouletteWheel(names);
        spinTimeout = setTimeout(rotateWheel, 30);
    }
    rotateWheel();
}

function stopRotate(names) {
    const teamSize = parseInt(document.getElementById('team-size').value);
    const index = Math.floor(((2 * Math.PI) - (startAngle % (2 * Math.PI))) / arc) % names.length;
    const picked = names.splice(index, 1)[0];

    // Logic to create a new team array if empty OR if the last team is full
    if (draftedOrder.length === 0 || draftedOrder[draftedOrder.length - 1].length === teamSize) {
        draftedOrder.push([picked]);
    } else {
        draftedOrder[draftedOrder.length - 1].push(picked);
    }

    updateDraftBoard();
    
    // Check if we still have names to draft
    if (remainingNames.length > 0) {
        setTimeout(processNext, 1000);
    } else {
        document.getElementById('roulette-container').style.display = "none";
        finalizeTournament(draftedOrder);
    }
}

function updateDraftBoard() {
    const board = document.getElementById('draft-board');
    board.innerHTML = "<strong>Drafted Teams:</strong>";
    draftedOrder.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.innerHTML = `<strong>Team ${index + 1}:</strong> ${team.join(" & ")}`;
        board.appendChild(teamDiv);
    });
}

function finalizeTournament(teamsArray) {
    let matches = teamsArray.map(team => team.join(" & "));
    createRound(matches);
}

function createRound(teams) {
    const container = document.getElementById('bracket-container');
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round';
    
    for (let i = 0; i < teams.length; i += 2) {
        const match = document.createElement('div');
        match.className = 'match';
        match.innerHTML = `
            <div class="player" onclick="advance(event)">${teams[i]}</div>
            <div class="player" onclick="advance(event)">${teams[i+1] || "Empty"}</div>
        `;
        roundDiv.appendChild(match);
    }
    container.appendChild(roundDiv);
    window.totalMatchesInRound = Math.ceil(teams.length / 2);
    window.matchesFinished = 0;
    window.nextRoundPlayers = [];
}

function advance(event) {
    const clicked = event.target;
    const matchContainer = clicked.parentElement;

    // Reset styles for both players in this match
    const players = Array.from(matchContainer.querySelectorAll('.player'));
    players.forEach(p => {
        p.classList.remove('winner', 'loser');
    });

    // Mark clicked as winner, the other as loser
    clicked.classList.add('winner');
    const opponent = players.find(p => p !== clicked);
    if (opponent) {
        opponent.classList.add('loser');
    }

    // Mark match as done
    matchContainer.dataset.done = "true";

    // Re-calculate the winners for the current round
    // We look for all matches in the current round that have a winner
    const currentRound = matchContainer.parentElement;
    const allMatches = Array.from(currentRound.querySelectorAll('.match'));
    
    // Check if every match in this round has a winner selected
    const allDecided = allMatches.every(m => m.dataset.done === "true");

    if (allDecided) {
        // Collect all winners from this round to pass to the next
        const winners = allMatches.map(m => m.querySelector('.winner').innerText);
        
        // Remove any existing subsequent rounds (in case user goes back and changes a pick)
        const container = document.getElementById('bracket-container');
        let nextSibling = currentRound.nextElementSibling;
        while(nextSibling) {
            container.removeChild(nextSibling);
            nextSibling = currentRound.nextElementSibling;
        }

        if (winners.length > 1) {
            setTimeout(() => createRound(winners), 500);
        } else {
            setTimeout(() => alert("Winner: " + winners[0]), 500);
        }
    }
}

function updatePlayerCount() {
    const inputs = document.querySelectorAll('.name-input');
    document.getElementById('player-count').innerText = inputs.length;
}

btn.addEventListener('click', () => {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = `<label>Name: </label><input type="text" class="name-input">`;
    container.appendChild(newDiv);
    
    updatePlayerCount();
});