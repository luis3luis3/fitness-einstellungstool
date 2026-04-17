const sliders = {
  lean: document.querySelector("#lean"),
  muscle: document.querySelector("#muscle"),
  effort: document.querySelector("#effort"),
  hunger: document.querySelector("#hunger"),
};

const outputs = {
  lean: document.querySelector("#lean-output"),
  muscle: document.querySelector("#muscle-output"),
  effort: document.querySelector("#effort-output"),
  hunger: document.querySelector("#hunger-output"),
};

const captions = {
  lean: document.querySelector("#lean-caption"),
  muscle: document.querySelector("#muscle-caption"),
  effort: document.querySelector("#effort-caption"),
};

const canvas = document.querySelector("#metabolic-map");
const ctx = canvas.getContext("2d");

const state = {
  lean: 50,
  muscle: 50,
  effort: 55,
  hunger: 45,
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const mix = (current, target, weight) => current + (target - current) * weight;

function handleSliderInput(key, rawValue) {
  const value = Number(rawValue);
  state[key] = value;

  if (key === "lean") {
    const conflict = Math.max(0, value - 45) * 0.5;
    state.muscle = clamp(mix(state.muscle, 62 - conflict + state.effort * 0.18, 0.68));
    state.effort = clamp(mix(state.effort, 34 + value * 0.58 + state.muscle * 0.16, 0.58));
  }

  if (key === "muscle") {
    const energyNeed = Math.max(0, value - 48) * 0.55;
    state.lean = clamp(mix(state.lean, 58 - energyNeed + state.effort * 0.14, 0.7));
    state.effort = clamp(mix(state.effort, 36 + value * 0.56 + state.lean * 0.12, 0.58));
  }

  if (key === "effort") {
    const boost = (value - 50) * 0.34;
    const fatiguePenalty = Math.max(0, value - 82) * 0.4;
    state.lean = clamp(mix(state.lean, state.lean + boost - fatiguePenalty, 0.5));
    state.muscle = clamp(mix(state.muscle, state.muscle + boost * 0.8 - fatiguePenalty, 0.5));
  }

  if (key === "hunger") {
    state.lean = clamp(mix(state.lean, 24 + value * 0.72, 0.62));
    state.effort = clamp(mix(state.effort, 38 + value * 0.34, 0.5));
    state.muscle = clamp(mix(state.muscle, 70 - value * 0.42 + state.effort * 0.16, 0.42));
  }

  applyBiology(key);
  render();
}

function applyBiology(activeKey) {
  const deficitPressure = state.lean * 0.72 - state.muscle * 0.28;
  const trainingStress = state.effort * 0.52 + state.muscle * 0.25;
  const hungerTarget = clamp(14 + deficitPressure * 0.72 + trainingStress * 0.28);
  state.hunger = activeKey === "hunger" ? state.hunger : mix(state.hunger, hungerTarget, 0.82);

  const recoveryCost = Math.max(0, state.hunger - 65) * 0.16 + Math.max(0, state.effort - 85) * 0.18;
  const recompBonus = state.effort > 58 && state.lean < 72 ? 4 : 0;
  state.muscle = clamp(state.muscle - recoveryCost + recompBonus * 0.16);

  if (state.lean > 76 && state.muscle > 66) {
    const conflict = (state.lean - 76 + state.muscle - 66) * 0.28;
    if (activeKey === "lean") state.muscle = clamp(state.muscle - conflict);
    if (activeKey === "muscle") state.lean = clamp(state.lean - conflict);
  }
}

function getStrategy() {
  const { lean, muscle, effort, hunger } = state;

  if (lean > 72 && muscle < 48) {
    return {
      title: "Cut / Lean werden",
      score: "Defizit-Fokus",
      copy: "Du priorisierst Fettabbau. Das klappt schneller, kostet aber Hunger und macht Muskelaufbau schwerer.",
    };
  }

  if (muscle > 72 && lean < 50) {
    return {
      title: "Aufbau / Stark werden",
      score: "Muskel-Fokus",
      copy: "Du priorisierst Muskelaufbau. Dafuer braucht dein Koerper Trainingsreiz, Erholung und eher weniger Defizit.",
    };
  }

  if (lean > 58 && muscle > 58 && effort > 62) {
    return {
      title: "Recomposition",
      score: "Ambitioniert",
      copy: "Du willst Fett verlieren und staerker werden. Das ist plausibel, aber nur mit hohem Einsatz und kontrolliertem Defizit.",
    };
  }

  if (effort < 36) {
    return {
      title: "Erhaltungsmodus",
      score: "Sanft",
      copy: "Wenig Aufwand senkt Hunger und Stress, begrenzt aber Tempo bei Fettabbau und Muskelaufbau.",
    };
  }

  if (hunger > 76) {
    return {
      title: "Aggressives Defizit",
      score: "Hart",
      copy: "Der Hunger ist hoch. Kurzfristig effektiv fuer Fettverlust, aber schwieriger fuer Training, Erholung und Alltag.",
    };
  }

  return {
    title: "Ausbalanciert",
    score: "Recomposition",
    copy: "Moderater Fettabbau, progressives Krafttraining und genug Energie fuer Leistung.",
  };
}

function labelForEnergy() {
  const balance = state.muscle - state.lean;
  if (balance > 28) return "leichter Ueberschuss";
  if (balance > 10) return "nahe Erhaltung";
  if (balance < -32) return "starkes Defizit";
  if (balance < -10) return "leichtes Defizit";
  return "kontrollierte Mitte";
}

function labelForTraining() {
  if (state.effort > 78) return "hoch";
  if (state.effort > 54) return "mittel-hoch";
  if (state.effort > 34) return "moderat";
  return "niedrig";
}

function labelForRecovery() {
  const pressure = state.effort * 0.45 + state.hunger * 0.55;
  if (pressure > 78) return "kritisch";
  if (pressure > 61) return "fordernd";
  if (pressure > 42) return "machbar";
  return "leicht";
}

function updateText() {
  const strategy = getStrategy();
  document.querySelector("#strategy-title").textContent = strategy.title;
  document.querySelector("#strategy-copy").textContent = strategy.copy;
  document.querySelector("#mode-label").textContent = strategy.score;
  document.querySelector("#score-label").textContent = strategy.title;
  document.querySelector("#energy-balance").textContent = labelForEnergy();
  document.querySelector("#training-load").textContent = labelForTraining();
  document.querySelector("#recovery-pressure").textContent = labelForRecovery();

  captions.lean.textContent =
    state.lean > 75
      ? "Schneller Fettabbau, aber hoher Hunger und mehr Risiko fuer Leistungseinbruch."
      : state.lean > 48
        ? "Moderates Defizit mit guter Chance auf Muskel-Erhalt."
        : "Wenig Defizit: leichter zu trainieren, aber Fettabbau wird langsamer.";

  captions.muscle.textContent =
    state.muscle > 74
      ? "Starker Aufbau-Fokus: Erholung und Energie werden wichtiger als ein hartes Defizit."
      : state.muscle > 48
        ? "Solider Trainingsreiz, noch kompatibel mit Fettabbau."
        : "Muskelaufbau ist gerade nachrangig; Erhalt ist realistischer als Zuwachs.";

  captions.effort.textContent =
    state.effort > 78
      ? "Sehr hoher Einsatz: mehr Potential, aber Erholung muss mitziehen."
      : state.effort > 50
        ? "Genug Einsatz fuer Training, Schritte und Essensplanung."
        : "Alltagsschonend, aber die Koerperveraenderung wird langsamer.";

  document.querySelector("#rule-list").innerHTML = [
    `Fettabbau bei ${Math.round(state.lean)} erhoeht den Defizitdruck und schiebt Hunger Richtung ${Math.round(state.hunger)}.`,
    `Muskelaufbau bei ${Math.round(state.muscle)} braucht Energie; deshalb drueckt ein harter Cut diesen Regler zurueck.`,
    `Anstrengung bei ${Math.round(state.effort)} verbessert beide Ziele, solange Erholung und Hunger nicht kippen.`,
  ]
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const center = { x: canvas.width / 2, y: 118 };
  const radius = 80;
  const points = [
    { key: "lean", label: "Lean", color: "#1f9d77", angle: -Math.PI / 2 },
    { key: "muscle", label: "Stark", color: "#d94b42", angle: Math.PI / 6 },
    { key: "effort", label: "Einsatz", color: "#315fbd", angle: (5 * Math.PI) / 6 },
  ];

  ctx.strokeStyle = "#ddd1bf";
  ctx.lineWidth = 1;
  [0.35, 0.7, 1].forEach((scale) => {
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = center.x + Math.cos(point.angle) * radius * scale;
      const y = center.y + Math.sin(point.angle) * radius * scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  ctx.beginPath();
  points.forEach((point, index) => {
    const scale = state[point.key] / 100;
    const x = center.x + Math.cos(point.angle) * radius * scale;
    const y = center.y + Math.sin(point.angle) * radius * scale;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(49, 95, 189, 0.16)";
  ctx.fill();
  ctx.strokeStyle = "#151515";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((point) => {
    const x = center.x + Math.cos(point.angle) * (radius + 28);
    const y = center.y + Math.sin(point.angle) * (radius + 28);
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#151515";
    ctx.font = "700 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(point.label, x, y + 22);
  });

  const hungerWidth = 220;
  const hungerX = (canvas.width - hungerWidth) / 2;
  const hungerY = 224;
  ctx.fillStyle = "#eadfce";
  ctx.fillRect(hungerX, hungerY, hungerWidth, 10);
  ctx.fillStyle = "#8a5a16";
  ctx.fillRect(hungerX, hungerY, hungerWidth * (state.hunger / 100), 10);
  ctx.fillStyle = "#68635d";
  ctx.font = "750 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Hunger / Defizitstress", canvas.width / 2, hungerY - 10);
}

function render() {
  Object.entries(state).forEach(([key, value]) => {
    const rounded = Math.round(value);
    sliders[key].value = rounded;
    outputs[key].textContent = rounded;
  });
  updateText();
  drawMap();
}

Object.entries(sliders).forEach(([key, slider]) => {
  slider.addEventListener("input", (event) => handleSliderInput(key, event.target.value));
});

document.querySelector("#reset-button").addEventListener("click", () => {
  state.lean = 50;
  state.muscle = 50;
  state.effort = 55;
  state.hunger = 45;
  render();
});

render();
