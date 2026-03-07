let ably, channel;
let currentRoomCode = null;
let isHost = false;

let remainingNames = [];
let draftedOrder = []; 
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let ctx;

async function initRoom(role) {
    const ABLY_KEY = 'WguLAg.JTlfJA:jtoShjnXjy5CVng7TfOH6VlKFOjhtEcy-jzYbuqjWX4'; 
    ably = new Ably.Realtime(ABLY_KEY);

    if (role === 'host') {
        isHost = true;
        currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    } else {
        isHost = false;
        currentRoomCode = document.getElementById('join-code').value;
        if (!currentRoomCode) return alert("Enter a code!");
    }

    channel = ably.channels.get(`room-${currentRoomCode}`);
    
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('display-room-code').innerText = currentRoomCode;
    document.getElementById('user-role').innerText = isHost ? "HOST" : "VIEWER";

    if (!isHost) {
        document.getElementById('host-controls').style.display = 'none';
        document.getElementById('spin-btn').style.display = 'none'; 

        channel.subscribe('sync-state', (message) => {
            updateViewForViewer(message.data);
        });
    }
}

function broadcastState() {
    if (!isHost) return;
    const state = {
        draftedOrder: draftedOrder,
        remainingNames: remainingNames,
        startAngle: startAngle, 
        bracketHTML: document.getElementById('bracket-container').innerHTML,
        winnerHTML: document.getElementById('winner-display').innerHTML,
        winnerVisible: document.getElementById('winner-display').style.display,
        isSpinning: !!spinTimeout 
    };
    channel.publish('sync-state', state);
}

function updateViewForViewer(state) {
    const board = document.getElementById('draft-board');
    board.innerHTML = "<strong>Drafted Teams:</strong>";
    state.draftedOrder.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.innerHTML = `<strong>Team ${index + 1}:</strong> ${team.join(", ")}`;
        board.appendChild(teamDiv);
    });

    const rouletteCont = document.getElementById('roulette-container');
    if (state.remainingNames && state.remainingNames.length > 0) {
        rouletteCont.style.display = "block";
        if (!ctx) {
            const canvas = document.getElementById("wheelCanvas");
            ctx = canvas.getContext("2d");
        }
        
        // Use the angle from the host
        startAngle = state.startAngle; 
        arc = Math.PI * 2 / state.remainingNames.length;
        
        drawRouletteWheel(state.remainingNames);
    } else {
        rouletteCont.style.display = "none";
    }

    document.getElementById('bracket-container').innerHTML = state.bracketHTML;
    document.getElementById('winner-display').innerHTML = state.winnerHTML;
    document.getElementById('winner-display').style.display = state.winnerVisible;
}

// --- CORE GAME LOGIC ---

function startDraft() {
    const inputs = document.querySelectorAll('.name-input');
    const teamSize = parseInt(document.getElementById('team-size').value);
    
    remainingNames = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
    
    if (remainingNames.length < teamSize || remainingNames.length % teamSize !== 0) {
        alert(`Please enter a number of names divisible by ${teamSize}.`);
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
        document.getElementById('spin-btn').style.display = 'inline-block';
        document.getElementById('status-msg').innerText = "Press Spin to draft!";
    } else {
        document.getElementById('roulette-container').style.display = "none";
        finalizeTournament(draftedOrder);
    }
}

function stopRotate(names) {
    clearTimeout(spinTimeout);
    const teamSize = parseInt(document.getElementById('team-size').value);
    const index = Math.floor(((2 * Math.PI) - (startAngle % (2 * Math.PI))) / arc) % names.length;
    const picked = names.splice(index, 1)[0];

    if (draftedOrder.length === 0 || draftedOrder[draftedOrder.length - 1].length === teamSize) {
        draftedOrder.push([picked]);
    } else {
        draftedOrder[draftedOrder.length - 1].push(picked);
    }

    updateDraftBoard();
    broadcastState(); 
    
    setTimeout(processNext, 1500);
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
            <div class="player" onclick="advance(event)">${teams[i+1] || "BYE"}</div>
        `;
        roundDiv.appendChild(match);
    }
    container.appendChild(roundDiv);
    broadcastState();
}

function advance(event) {
    if (!isHost) return; 
    const clicked = event.target;
    if (clicked.innerText === "BYE" || clicked.classList.contains('match')) return;

    const matchContainer = clicked.parentElement;
    const players = Array.from(matchContainer.querySelectorAll('.player'));
    
    players.forEach(p => p.classList.remove('winner', 'loser'));
    clicked.classList.add('winner');
    const opponent = players.find(p => p !== clicked);
    if (opponent) opponent.classList.add('loser');

    matchContainer.dataset.done = "true";

    const currentRound = matchContainer.parentElement;
    const allMatches = Array.from(currentRound.querySelectorAll('.match'));
    
    if (allMatches.every(m => m.dataset.done === "true")) {
        const winners = allMatches.map(m => m.querySelector('.winner').innerText);
        if (winners.length > 1) {
            createRound(winners);
        } else {
            showWinner(winners[0]);
        }
    }
    broadcastState();
}

function showWinner(name) {
    const display = document.getElementById('winner-display');
    display.style.display = 'block';
    display.innerHTML = `<h2>🏆 Tournament Winner: ${name} 🏆</h2>`;
    broadcastState(); 
}

// --- WHEEL DRAWING ---

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
        ctx.fillStyle = `hsl(${(i * (360 / names.length))}, 70%, 60%)`;
        ctx.beginPath();
        ctx.arc(200, 200, outsideRadius, angle, angle + arc, false);
        ctx.lineTo(200, 200);
        ctx.fill();
        ctx.stroke(); 

        ctx.save();
        ctx.fillStyle = "white"; 
        ctx.font = "bold 14px Arial";
        ctx.translate(200 + Math.cos(angle + arc / 2) * textRadius, 200 + Math.sin(angle + arc / 2) * textRadius);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        ctx.fillText(names[i], -ctx.measureText(names[i]).width / 2, 0);

        
        ctx.restore();

    }
    ctx.fillStyle = "White";
    ctx.beginPath();
    ctx.moveTo(400, 190); ctx.lineTo(400, 210); ctx.lineTo(380, 200); ctx.fill();
}

function spin() {
    if (!isHost) return; // Safety check
    const spinAngleStart = Math.random() * 10 + 10;
    let spinTime = 0;
    const spinTimeTotal = Math.random() * 3000 + 4000;

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) { 
            stopRotate(remainingNames); 
            return; 
        }
        const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
        startAngle += (spinAngle * Math.PI / 180);
        drawRouletteWheel(remainingNames);
        
        broadcastState(); 

        spinTimeout = setTimeout(rotateWheel, 30);
    }
    rotateWheel();
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

function updateDraftBoard() {
    const board = document.getElementById('draft-board');
    board.innerHTML = "<strong>Drafted Teams:</strong>";
    draftedOrder.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.innerHTML = `<strong>Team ${index + 1}:</strong> ${team.join(", ")}`;
        board.appendChild(teamDiv);
    });
}

function finalizeTournament(teamsArray) {
    let matches = teamsArray.map(team => team.join(" & "));
    createRound(matches);
}

// --- UI HANDLERS ---
document.getElementById('add-btn').addEventListener('click', () => {
    const container = document.getElementById('form-container');
    const newDiv = document.createElement('div');
    newDiv.className = 'input-row';
    newDiv.innerHTML = `
        <label>Name: </label>
        <input type="text" class="name-input">
        <button type="button" class="delete-btn" onclick="removeField(this)">×</button>
    `;
    container.appendChild(newDiv);
    updatePlayerCount();
});

function removeField(button) {
    const rows = document.querySelectorAll('#form-container > div');
    if (rows.length > 2) {
        button.parentElement.remove();
        updatePlayerCount();
    }
}

function updatePlayerCount() {
    document.getElementById('player-count').innerText = document.querySelectorAll('.name-input').length;
}