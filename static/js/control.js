/* eslint-disable no-console, no-plusplus, no-continue, @typescript-eslint/no-loop-func, prefer-destructuring, no-bitwise */
/* eslint-env browser */
/* global config */

const { matrixSize, treeRatio, treeIp } = config;

const matrixHeightScale = treeRatio;
const treeAddress = treeIp;

const dots = [];

const canvas = {
  output: null,
  context: null,
  width: null,
  height: null,

  perspective: null,
};

let sendCommands = true;

function setup() {
  fillStatus().catch(() => {});
  canvas.output = document.getElementById('canvasOutput');
  canvas.context = canvas.output.getContext('2d');
  canvas.width = canvas.output.offsetWidth;
  canvas.height = canvas.output.offsetHeight;

  canvas.perspective = matrixSize * 10;

  fillDots();
  setupControls();
  setupMode('sparkling'); // flag/collect/sparkling
}

function setupControls() {
  document.querySelectorAll(`input[type='radio'][name='speed']`).forEach((radio) => {
    radio.addEventListener('change', (event) => {
      const value = Number.parseInt(event.target.id.replace(/^.+-/, ''), 10);
      if (Number.isNaN(value)) {
        return;
      }
      setSpeed(value);
    });
  });
  document.querySelectorAll(`input[type='radio'][name='speed']`).forEach((radio) => {
    radio.addEventListener('shuffle', (event) => {
      const value = Number.parseInt(event.target.id.replace(/^.+-/, ''), 10);
      if (Number.isNaN(value)) {
        return;
      }
      // TODO
      // setShuffle(value);
    });
  });
  document.querySelectorAll(`input[type='radio'][name='prgr']`).forEach((radio) => {
    // eslint-disable-next-line complexity
    radio.addEventListener('change', (event) => {
      const [, program, value] = event.target.id.split(/prgr-(.+?)-(.+)/);
      setupMode(program);
      switch (program) {
        case 'collect': {
          if (value === '1') {
            prgr.collect.clearPrev = false;
            prgr.collect.collectFull = false;
          }
          if (value === '2') {
            prgr.collect.clearPrev = false;
            prgr.collect.collectFull = true;
            sendPreset(4, 2);
          }
          if (value === '3') {
            prgr.collect.clearPrev = true;
            prgr.collect.collectFull = false;
            sendPreset(4, 1);
          }
          break;
        }
        case 'flag': {
          const [, flag, mode] = value.split(/(.+)-(.+)/);
          prgr.flag.flag = flag;
          prgr.flag.mode = mode;
          fillFlagInit();
          sendPreset(mode === 'wave' ? 5 : 6, convertFlagToMode(flag));
          break;
        }
        case 'sparkling': {
          prgr.sparkling.colors = value === '1';
          prgr.sparkling.warm = ['3', '4'].includes(value);
          prgr.sparkling.inverse = ['2', '4'].includes(value);
          sendPreset(2, value - 0);
          break;
        }
        case 'rainbow': {
          sendPreset(3, 0);
          break;
        }
        case 'solid': {
          sendPreset(1, 0);
          break;
        }
        case 'sound': {
          sendPreset(7, value);
          break;
        }
        default:
      }
    });
  });
}

function convertFlagToMode(flag) {
  if (flag === 'bchb') {
    return 1;
  }
  if (flag === 'nl') {
    return 2;
  }
  if (flag === 'ua') {
    return 3;
  }
  if (flag === 'sp') {
    return 4;
  }
  return 1;
}
function setSpeed(value) {
  if (!sendCommands) {
    return;
  }
  speed = value;
  const url = `http://${treeAddress}/speed?v=${value}`;
  fetch(url, {
    mode: 'no-cors',
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}
function sendPreset(preset, mode) {
  if (!sendCommands) {
    return;
  }
  const url = `http://${treeAddress}/preset?preset=${preset}&mode=${mode}`;
  fetch(url, {
    mode: 'no-cors',
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}
function getStatus() {
  const url = `http://${treeAddress}/status`;
  return (
    fetch(url, {
      signal: AbortSignal.timeout(5000),
      method: 'GET',
    })
      .then((d) => d.json())
      // .then((d) => d.text())
      .catch((e) => console.error(e))
  );
}
async function fillStatus() {
  sendCommands = false;
  const status = await getStatus();
  if (!status || !status.speed) {
    sendCommands = true;
    return;
  }
  const s = document.querySelector(`#speed-${status.speed}`);
  if (s) {
    s.click();
  }
  const sh = document.querySelector(`#shuffle-${status.shuffle ? 2 : 1}`);
  if (sh) {
    sh.click();
  }
  sendCommands = true;
}

let dotsNum = 0;
function fillDots() {
  let i = 0;
  for (let z = 0; z < matrixSize * matrixHeightScale; z++) {
    const maxR = Math.floor((1 - z / (matrixSize * matrixHeightScale)) * (matrixSize / 2));
    for (let x = -matrixSize / 2; x <= matrixSize / 2; x++) {
      for (let y = -matrixSize / 2; y <= matrixSize / 2; y++) {
        if ((x ** 2 + y ** 2) ** (1 / 2) <= maxR) {
          dots.push({ x: x + matrixSize / 2, y: y + matrixSize / 2, z, color: '#000000', i });
          i++;
        }
      }
    }
  }
  dotsNum = i;
}

function render() {
  canvas.output.style.background = 'black';
  canvas.context.clearRect(0, 0, canvas.width, canvas.height);

  const DOT_RADIUS = 7;
  const box = {
    cx: canvas.width / 2,
    cy: canvas.height / 2,
    t: 10,
    b: canvas.height - 20,
  };
  const boxHeight = box.b - box.t;
  const boxWidth = boxHeight * (matrixHeightScale / matrixSize);
  box.l = (canvas.width - boxWidth) / 2;
  box.r = (canvas.width + boxWidth) / 2;

  for (const dot of dots) {
    if (['#000', '#000000', 'black'].includes(dot.color)) {
      continue;
    }
    const scale = canvas.perspective / (canvas.perspective + dot.y);
    const x = (dot.x - matrixSize / 2) * scale * ((boxWidth / matrixSize) * 2) + box.cx;
    const y = (1 - dot.z / (matrixSize * matrixHeightScale)) * scale * boxHeight;
    const r = DOT_RADIUS * scale;

    // canvas.context.globalCompositeOperation = 'lighter';
    canvas.context.globalAlpha = dot.fade ? 0.5 - 0.0625 * dot.fade : 0.5; // Math.abs(1 - dot.y / matrixSize);

    canvas.context.beginPath();
    canvas.context.arc(x, y, r, 0, Math.PI * 2);
    canvas.context.fillStyle = dot.color;
    canvas.context.fill();
  }
}

function cos(angle) {
  return Math.cos((angle * Math.PI) / 180);
}
function sin(angle) {
  return Math.sin((angle * Math.PI) / 180);
}

function getRandomColor() {
  return `#${getRandomBite()}${getRandomBite()}${getRandomBite()}`;
}
function getRandomBite() {
  return Math.floor(Math.random() * (256 - 50) + 50).toString(16);
}

const FPS = 50;
let speed = 5;

function getDelay() {
  return (1000 / FPS) * (11 - speed);
}

// eslint-disable-next-line complexity
function setDot({ x, y, z, i, color, fade }) {
  if (i !== undefined) {
    const dot = dots.find((d) => d.i === i);
    if (dot) {
      dot.color = color;
      dot.fade = fade;
    }
    return;
  }
  for (const dot of dots) {
    if (
      (x === undefined || x === dot.x) &&
      (y === undefined || y === dot.y) &&
      (z === undefined || z === dot.z)
    ) {
      dot.color = color;
      dot.fade = fade;
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fadeColor(color, steps) {
  const [, r, g, b] = color.split(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (!r) {
    return '#000';
  }
  function fade(c) {
    const r = (parseInt(c, 16) >>> steps).toString(16);
    return r.length === 2 ? r : `0${r}`;
  }
  return `#${fade(r)}${fade(g)}${fade(b)}`;
}

function hash1(s) {
  let a = s ^ 61 ^ (s >> 16);
  a += a << 3;
  a ^= a >> 4;
  a *= 0x27d4eb2d;
  a ^= (a & 0xffffffff) >> 15;
  return a;
}
function hash2(s) {
  const b = 0xffffffffn;
  let hash = BigInt(s + 1);
  // hash += s;
  hash += (hash << 10n) & b;
  hash ^= (hash >> 6n) & b;
  hash += (hash << 3n) & b;
  hash ^= (hash >> 11n) & b;
  hash += (hash << 15n) & b;
  // console.log(hash.toString(16));
  return hash;
}

// eslint-disable-next-line prettier/prettier
const randomNumbers = [0x96d3, 0xa8a0, 0xf549, 0xb6b0, 0xa5e4, 0x8c67, 0xa87e, 0xb529, 0xc578, 0x7f43, 0xbaa7, 0x8a69, 0x7720, 0x759, 0x8bfe, 0x5343, 0x50db, 0x220, 0x4e01, 0xdfd9, 0x2e5c, 0x4e12, 0xe727, 0xc42e, 0xecfc, 0x96c2, 0xd0e2, 0x5d86, 0xebf2, 0xfdd0, 0x5bfa, 0xc747, 0x7415, 0xc3ca, 0xdad3, 0xcea2, 0x41f2, 0xc097, 0x30d, 0x660e, 0x1327, 0x3999, 0xcba8, 0x13b2, 0x80b4, 0x60b, 0xd9d0, 0x1676, 0xb30b, 0x9f05, 0xa8f5, 0x2876, 0xd7c, 0xcc05, 0xcf2c, 0x7968, 0x220b, 0xb252, 0x97bb, 0x8fb4, 0x829, 0x7ece, 0xf70a, 0x9b0f, 0x2d7, 0x4d79, 0x2bc9, 0x1357, 0xf9d3, 0x32fc, 0x4e98, 0xf24d, 0x3ca0, 0x7cc0, 0x3092, 0xbe4f, 0x6b25, 0x4b34, 0x6b80, 0x5a50, 0x4bcd, 0x5a21, 0x7fca, 0x6297, 0x724c, 0xbf0a, 0xf7ff, 0x256, 0xc557, 0x5d8f, 0x2720, 0x556b, 0x32c5, 0x88f2, 0x8855, 0xd5bb, 0xfed4, 0xe18f, 0x573f, 0x9a9e, 0x437, 0x24ea, 0x11d4, 0x92b7, 0x2554, 0x9503, 0x6d65, 0xd901, 0x6453, 0x1fb0, 0x1d40, 0xe46f, 0x3d4b, 0x6b29, 0x2e42, 0x3ca6, 0x8e21, 0x30a5, 0xbd63, 0x7c54, 0x2e14, 0xd5bb, 0x250a, 0xabc, 0x6f81, 0x4e4b, 0xce41, 0x446e, 0xf47c, 0xe0cf, 0xbc27, 0x2014, 0xde3f, 0xada6, 0x219, 0x4db4, 0x2e44, 0xd864, 0x9a73, 0x6191, 0xe075, 0xbd5d, 0x3a54, 0xd6f5, 0xf7e5, 0x217d, 0x8f28, 0x6779, 0xa53e, 0xfe5b, 0x7d7b, 0x25b1, 0x2ffe, 0x2396, 0x1949, 0xed6a, 0x5f24, 0x91ad, 0x5b32, 0x70da, 0xa49a, 0xa6f2, 0x9311, 0x4613, 0x2df3, 0xabad, 0xb87, 0xa23, 0xab96, 0x2c54, 0xf01e, 0x4537, 0x3da7, 0x1058, 0x2d56, 0x18a4, 0x62b4, 0xe941, 0x43f2, 0x19e8, 0x7585, 0x9c2a, 0x7b56, 0xe10, 0xc07e, 0xc42f, 0xf8cc, 0x3859, 0x8487, 0x4c30, 0xb7ab, 0x6ae6, 0xefd6, 0xddea, 0x6c41, 0x77ca, 0x456, 0x7694, 0x7196, 0x9b64, 0xcf0d, 0xde95, 0x8902, 0xa4b6, 0xb9f4, 0x3de4, 0xe9bb, 0x9ee4, 0xc163, 0xd3b6, 0x6153, 0x8e06, 0xec50, 0x4f81, 0xca8d, 0x5c5a, 0x28d0, 0xa8bc, 0x3e40, 0x7045, 0x9a93, 0x65b8, 0x55f9, 0x8a86, 0x5fad, 0xa310, 0x4f97, 0xf6eb, 0x4d4b, 0x5495, 0x22dd, 0x2529, 0x434e, 0xea81, 0xa69b, 0xccf6, 0xc66d, 0xe2db, 0xbf02, 0x59a4, 0xe6cb, 0xa76d, 0x7191, 0x6421, 0xb8aa, 0x1ecc, 0x98bd, 0x1ce3, 0x6107, 0x3f2a, 0xb1ec, 0xd005, 0x5f4b, 0xad4c, 0xb92f, 0xa498, 0x197c, 0xc682, 0x3c4b, 0x3cda, 0x45cb, 0xa310, 0xb391, 0xe54e, 0xe706, 0x3457, 0xa25, 0xbe65, 0x4297, 0x6bfa, 0xefdc, 0x3ad7, 0x4739, 0xcc65, 0x977f, 0xa013, 0x2161, 0xebe2, 0x495b, 0x62ca, 0xe045, 0x6844, 0x8d38, 0xe857, 0xb069, 0x23b0, 0xd927, 0xfe5a, 0x7a4d, 0x8dbc, 0xf7c4, 0x535f, 0x3132, 0xb563, 0x5015, 0xddff, 0xd97e, 0x633f, 0xf39c, 0xa82d, 0x272e, 0xd900, 0x3597, 0xafbe, 0x9043, 0xc835, 0x84cf, 0x2d1c, 0x84c6, 0xd3b, 0x4c75, 0xc37f, 0x9047, 0x946e, 0xd07d, 0x65a, 0xe589, 0xb8c4, 0xb44b, 0x60e1, 0xdcdc, 0xb6f5, 0x251e, 0x4812, 0xa056, 0x8101, 0x66ca, 0xe340, 0x2ccc, 0x9174, 0xbdd4, 0xdeec, 0x6241, 0xc553, 0x8e1c, 0x5e29, 0x5810, 0xfc1, 0x3b35, 0x1de, 0x11b8, 0x3556, 0xdb74, 0x3119, 0xad11, 0xf772, 0x15f5, 0x3949, 0x8aa0, 0xc449, 0xa2f8, 0x6120, 0xf659, 0x96fe, 0xceb8, 0xdce6, 0xe7c6, 0x6ce, 0x4304, 0xf37a, 0xe4b1, 0x17bb, 0x7925, 0x5827, 0x1cdc, 0x86f2, 0x2ce6, 0x621, 0x1a00, 0xf3c8, 0x30f7, 0x58eb, 0x7e63, 0xfa7e, 0x2ebf, 0x69c8, 0x56f4, 0x5252, 0x5609, 0xd522, 0xfa7c, 0xaf6, 0xa446, 0x7106, 0xd76c, 0x3d09, 0x2252, 0x70c0, 0x827f, 0x813e, 0xeb6a, 0x94f4, 0xb307, 0xd75a, 0xa66d, 0xf150, 0x339e, 0x64e6, 0x10b1, 0xb325, 0x7fb5, 0xfb07, 0x4937, 0x897c, 0x5e93, 0x96cb, 0x3b77, 0x6b8e, 0x5479, 0x2363, 0xffaf, 0xcf05, 0xaf2b, 0xce54, 0x492e, 0x603c, 0x6104, 0x946, 0x4939, 0xb6f4, 0x739e, 0xc924, 0x701, 0xb1ef, 0xa9b, 0xe52e, 0x5083, 0xe1d3, 0x3688, 0xb919, 0x16c0, 0x2bdb, 0xa81f, 0x5a9f, 0x37b0, 0xe358, 0x2e12, 0xf69e, 0xf6fc, 0x6146, 0x1190, 0x2b14, 0x846d, 0x29f1, 0xcc5f, 0x9d0d, 0x267d, 0x22af, 0xdb40, 0x23bf, 0x686f, 0xf06c, 0x18ec, 0x846f, 0x4589, 0x6f6e, 0x9a24, 0x14b2, 0x3d0b, 0x748a, 0x41d7, 0x5d08, 0xad81, 0x20ae, 0x70e9, 0xd17d, 0xb9ba, 0x1d86, 0x790e, 0x60fa, 0x3531, 0xd489, 0x4cfd, 0x790b, 0xee19, 0x40c8, 0xe5da, 0xcb4e, 0xd784, 0x84c, 0x24d, 0xc58a, 0x61f, 0xd21e, 0xd505, 0x327, 0xdadf, 0xb94d, 0x78ae, 0x277f, 0x55d7, 0xfc9d, 0xc356, 0xbc94, 0x2c6c, 0x4022, 0xedee, 0xdb, 0xa436];
function getRandomNumber(s, base = 100) {
  return Number((hash2(s) & 0xffffn) % BigInt(base));
}

const palette = [
  '#ff1744',
  '#f50057',
  '#d500f9',
  '#651fff',
  '#3d5afe',
  '#2979ff',
  '#00b0ff',
  '#00e5ff',
  '#1de9b6',
  '#00e676',
  '#76ff03',
  '#c6ff00',
  '#ffea00',
  '#ffc400',
  '#ff9109',
  '#ff3d00',
];

const prgr = {
  currentMode: 'sparkling',
  collect: {},
  flag: {},
  sparkling: {},
};
prgr.modes = Object.keys(prgr).filter((key) => key !== 'currentMode');

function setupMode(mode) {
  prgr.currentMode = mode;
  for (const dot of dots) {
    dot.color = '#000';
    dot.fade = undefined;
  }
  window[`${prgr.currentMode}Setup`]();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function collectSetup() {
  prgr.collect = {
    step: 0,
    returnStep: 0,
    color: null,

    clearPrev: false,
    collectFull: false,
  };
}
// eslint-disable-next-line complexity, @typescript-eslint/no-unused-vars
function collect() {
  if (
    (!prgr.collect.collectFull && !prgr.collect.returnStep) ||
    (!prgr.collect.step && !prgr.collect.returnStep)
  ) {
    prgr.collect.color = getRandomColor();
  }

  const z = matrixSize * matrixHeightScale - prgr.collect.returnStep - 1;

  dots.forEach((dot) => {
    if (dot.z !== z) {
      if ((prgr.collect.clearPrev || prgr.collect.collectFull) && dot.z === z + 1) {
        dot.color = '#000';
      }
      return;
    }
    dot.color = prgr.collect.color;
  });

  prgr.collect.returnStep++;

  if (prgr.collect.returnStep >= matrixSize * matrixHeightScale - prgr.collect.step) {
    prgr.collect.returnStep = 0;
    prgr.collect.step++;
    if (prgr.collect.step >= matrixSize * matrixHeightScale) {
      prgr.collect.step = 0;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function flagSetup() {
  prgr.flag = {
    step: 0,
    flag: 'nl',
    mode: 'wave', // wave/siren

    flagSets: {
      bchb: [
        ['#fff', 8],
        ['#f00', 5],
        ['#fff', 4],
      ],
      ua: [
        ['blue', 10],
        ['yellow', 7],
      ],
      nl: [
        ['#f00', 8],
        ['#fff', 5],
        ['#00f', 4],
      ],
      sp: [
        ['red', 8],
        ['yellow', 5],
        ['red', 4],
      ],
    },
    siren: {
      steps: 12,
      startAngle: 7.5,
    },
  };
  fillFlagInit();
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars, complexity
function flag() {
  const flag = prgr.flag.flagSets[prgr.flag.flag];
  if (prgr.flag.mode === 'wave') {
    let toZ = 0;
    flag.forEach((strip, n) => {
      toZ += strip[1];
      if (!flag[n + 1]) {
        return;
      }
      for (let i = 0; i < 4; i++) {
        const step = (i + prgr.flag.step) % 4;
        const topColor = step !== 0 ? flag[n + 1][0] : strip[0];
        const bottomColor = step === 2 ? flag[n + 1][0] : strip[0];
        const z = matrixSize * matrixHeightScale - toZ;
        setDot({ x: 2 * i, z, color: topColor });
        setDot({ x: 2 * i + 1, z, color: topColor });
        setDot({ x: 2 * i, z: z + 1, color: bottomColor });
        setDot({ x: 2 * i + 1, z: z + 1, color: bottomColor });
      }
    });
    prgr.flag.step++;
    if (prgr.flag.step > 3) {
      prgr.flag.step = 0;
    }
  }
  if (prgr.flag.mode === 'siren') {
    if (flag.length === 3 && flag[0][0] === flag[2][0]) {
      flagSirenFillStrip(prgr.flag.step ? prgr.flag.step - 1 : prgr.flag.siren.steps, flag[0][0]);
      flagSirenFillStrip(prgr.flag.step, flag[1][0]);
      prgr.flag.step++;
      if (prgr.flag.step >= prgr.flag.siren.steps) {
        prgr.flag.step = 0;
      }
    }
  }
}
function flagSirenFillStrip(step, color) {
  const sirenStepAngle = 180 / prgr.flag.siren.steps;
  for (let l = 0; l <= 4; l++) {
    const angle = sirenStepAngle * step + prgr.flag.siren.startAngle;
    const x1 = Math.round(l * cos(angle)) + 4;
    const y1 = Math.round(l * sin(angle)) + 4;
    const x2 = Math.round(l * cos(angle + 180)) + 4;
    const y2 = Math.round(l * sin(angle + 180)) + 4;
    setDot({ x: x1, y: y1, color });
    setDot({ x: x2, y: y2, color });
  }
}
function fillFlagInit() {
  const flag = prgr.flag.flagSets[prgr.flag.flag];
  let z = 0;
  let toZ = 0;
  if (prgr.flag.mode === 'siren') {
    if (flag.length === 3 && flag[0][0] === flag[2][0]) {
      dots.forEach((dot) => {
        dot.color = flag[0][0];
      });
    }
    return;
  }
  flag.forEach((strip) => {
    toZ += strip[1];
    while (z < toZ) {
      dots
        .filter((dot) => dot.z === matrixSize * matrixHeightScale - z)
        .forEach((dot) => {
          dot.color = strip[0];
        });
      z++;
    }
  });
}

function getSparklingColor(dotStep) {
  if (prgr.sparkling.colors) {
    return palette[getRandomNumber(dotStep, palette.length)];
  }
  if (prgr.sparkling.warm) {
    return `#ff5000`;
  }
  return '#ffffff';
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars, complexity
function sparkling() {
  const sparks = 5;
  const steps = 8;
  for (let s = 0; s < sparks; s++) {
    const dotStep = prgr.sparkling.step * sparks + s;
    const spark = getRandomNumber(dotStep, dotsNum);
    const color = getSparklingColor(dotStep);
    setDot({ i: spark, color });
    for (let i = prgr.sparkling.step - 1; i >= 0 && i + steps > prgr.sparkling.step; i--) {
      const dotStep = i * sparks + s;
      const spark = getRandomNumber(i * sparks + s, dotsNum);
      const fade = prgr.sparkling.step - i;
      const color = getSparklingColor(dotStep);
      setDot({ i: spark, color, fade });
    }
  }
  prgr.sparkling.step++;
  // steps should be near dot num
  if (prgr.sparkling.step >= 250) {
    prgr.sparkling.step = 0;
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sparklingSetup() {
  prgr.sparkling = {
    step: 0,
    colors: false,
    warm: true,
    inverse: true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rainbowSetup() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rainbow() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function solidSetup() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function solid() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sound() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function soundSetup() {}

function loop() {
  window[prgr.currentMode]();
  window.requestAnimationFrame(render);
  setTimeout(loop, getDelay());
}

setTimeout(() => {
  setup();
  setTimeout(loop, getDelay());
}, 100);

/* eslint-enable no-console, no-plusplus, no-continue, @typescript-eslint/no-loop-func, prefer-destructuring, no-bitwise */
