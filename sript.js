const container = document.getElementById('form-container');
const btn = document.getElementById('add-btn');

btn.addEventListener('click', () => {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = `<label>Name: </label><input type="text" class="name-input">`;
    container.appendChild(newDiv);
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
    remainingNames = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
    
    if (remainingNames.length < 2) {
        alert("Please enter at least 2 names!");
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
    // 1. Clear the canvas once at the very start
    ctx.clearRect(0, 0, 400, 400);
    
    const outsideRadius = 180;
    const textRadius = 140;

    // 2. Loop to draw segments
    for(let i = 0; i < names.length; i++) {
        const angle = startAngle + i * arc;

        const hue = (i * (360 / names.length));
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        
        ctx.beginPath();
        ctx.arc(200, 200, outsideRadius, angle, angle + arc, false);
        ctx.lineTo(200, 200);
        ctx.fill();
        ctx.stroke(); 

        // 3. Draw text
        ctx.save();
        ctx.fillStyle = "white"; 
        ctx.font = "bold 14px Arial";
        ctx.translate(200 + Math.cos(angle + arc / 2) * textRadius, 
                      200 + Math.sin(angle + arc / 2) * textRadius);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        ctx.fillText(names[i], -ctx.measureText(names[i]).width / 2, 0);
        ctx.restore();
    }

    // 4. Draw the indicator ONCE after all segments are drawn
    // This ensures it sits on top and doesn't flicker
ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(400, 190);  // Right side starting point (near edge)
    ctx.lineTo(400, 210);  // Top point of triangle (pointing left)
    ctx.lineTo(380, 200);  // Bottom point of triangle (pointing left)
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
    const index = Math.floor(((2 * Math.PI) - (startAngle % (2 * Math.PI))) / arc) % names.length;
    const picked = names.splice(index, 1)[0];

    if (draftedOrder.length === 0 || draftedOrder[draftedOrder.length - 1].length === 2) {
        draftedOrder.push([picked]);
    } else {
        draftedOrder[draftedOrder.length - 1].push(picked);
    }

    updateDraftBoard();
    setTimeout(processNext, 1000);
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
            <div class="player" onclick="advance(event)">${teams[i+1] || "BYE"}</div>
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
    const container = clicked.parentElement;
    if (container.dataset.done === "true") return;
    container.dataset.done = "true";
    container.style.backgroundColor = "#c8e6c9";
    window.nextRoundPlayers.push(clicked.innerText);
    if (++window.matchesFinished === window.totalMatchesInRound) {
        if (window.nextRoundPlayers.length > 1) createRound(window.nextRoundPlayers);
        else alert("Winner: " + window.nextRoundPlayers[0]);
    }
}

function updatePlayerCount() {
    const inputs = document.querySelectorAll('.name-input');
    document.getElementById('player-count').innerText = inputs.length;
}

// Update the event listener for the "Add Name Field" button
btn.addEventListener('click', () => {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = `<label>Name: </label><input type="text" class="name-input">`;
    container.appendChild(newDiv);
    
    // Call the count update whenever a new field is added
    updatePlayerCount();
});