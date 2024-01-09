/* eslint-disable no-console */
/* eslint-env browser */
/* global cv, config */

const isTest = false;

const { leds, treeRatio, treeIp } = config;

const FPS = 30;
const repeatWithNextColor = false;
const resolution = 'tree';

const testData = isTest ? generateTestSet() : null;

const colors = {
  white: null,
  red: null,
  green: null,
  blue: null,
};
const processParams = {
  blurSize: 3,
  thresh: 220,
  threshMax: 255,
  kernel: 4,
  treeAddress: treeIp,
};
const videoData = {
  video: null,
  stream: null,
  streaming: false,
  showLive: true,
  videoInput: null,
  startAndStop: null,
  canvasOutput: null,
  canvasContext: null,
  src: null,
  dst: null,
  cap: null,
};
const calibrationData = {
  calibrating: false,
  calibrationRadiusThreshold: 10,
  manualCorrection: false,
  manualPoint: null,
  currentLed: 0,
  color: 'green',
  repeatWithNextColor: null,
  angle: 0,
  data: {},
};
const buttons = {
  startAndStop: {
    button: null,
    init() {
      buttons.startAndStop.button = document.getElementById('startAndStop');
      buttons.startAndStop.button.addEventListener('click', buttons.startAndStop.click);
    },
    click() {
      if (!videoData.streaming) {
        startCamera(resolution, 'videoInput');
        buttons.startAndStop.button.innerText = 'Stop';
        buttons.performCalibration.button.removeAttribute('disabled');
      } else {
        stopCalibration();
        stopCamera();
        onVideoStopped();
        buttons.startAndStop.button.innerText = 'Start';
        buttons.performCalibration.button.setAttribute('disabled', true);
      }
    },
  },
  performCalibration: {
    button: null,
    init() {
      buttons.performCalibration.button = document.getElementById('performCalibration');
      buttons.performCalibration.button.addEventListener('click', buttons.performCalibration.click);
    },
    click() {
      if (!calibrationData.calibrating) {
        startCalibration();
      } else {
        stopCalibration();
      }
    },
  },
};
const constraints = {
  qvga: {
    width: {
      exact: 320,
    },
    height: {
      exact: 240,
    },
  },
  vga: {
    width: {
      exact: 640,
    },
    height: {
      exact: 480,
    },
  },
  tree: {
    width: {
      exact: 800,
    },
    height: {
      exact: 800,
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Module = {
  onRuntimeInitialized() {
    buttons.startAndStop.init();
    buttons.performCalibration.init();
    videoData.videoInput = document.getElementById('videoInput');
    videoData.videoInput.addEventListener('click', (event) => {
      calibrationData.manualPoint = [{ x: event.offsetX, y: event.offsetY, r: 1 }];
    });
    document.getElementById('fp-tree-address').setAttribute('value', processParams.treeAddress);
    document.getElementById('nextLed').addEventListener('click', () => {
      calibrationData.manualPoint = [];
    });
    videoData.canvasOutput = document.getElementById('canvasOutput');
    videoData.canvasContext = videoData.canvasOutput.getContext('2d');
    document.getElementById('fp-blur-radius').addEventListener('change', (event) => {
      const num = parseInt(event.target.value, 10);
      if (!Number.isNaN(num) && num % 2 === 1) {
        processParams.blurSize = num;
      }
    });
    document.getElementById('fp-thresh').addEventListener('change', (event) => {
      const num = parseInt(event.target.value, 10);
      if (!Number.isNaN(num)) {
        processParams.thresh = num;
      }
    });
    document.getElementById('fp-thresh-max').addEventListener('change', (event) => {
      const num = parseInt(event.target.value, 10);
      if (!Number.isNaN(num)) {
        processParams.threshMax = num;
      }
    });
    document.getElementById('fp-kernel').addEventListener('change', (event) => {
      const num = parseInt(event.target.value, 10);
      if (!Number.isNaN(num)) {
        processParams.kernel = num;
      }
    });
    // document.getElementById('fp-angle').addEventListener('change', (event) => {
    //   const num = parseInt(event.target.value, 10);
    //   if (!Number.isNaN(num)) {
    //     testAngle = num * 15;
    //   }
    // });
    document.querySelectorAll(`input[type='radio'][name='fp-angle']`).forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const num = parseInt(event.target.value, 10);
        if (!Number.isNaN(num)) {
          calibrationData.angle = num;
        }
      });
    });
    document.querySelectorAll(`input[type='radio'][name='fp-color-mode']`).forEach((radio) => {
      radio.addEventListener('change', (event) => {
        calibrationData.color = event.target.value;
      });
    });
    document.getElementById('fp-manual').addEventListener('change', (event) => {
      calibrationData.manualCorrection = event.target.checked;
    });
    calibrationData.calibrationProgress = document.getElementById('calibration-led');
    colors.white = new cv.Scalar(255, 255, 255);
    colors.red = new cv.Scalar(255, 0, 0);
    colors.green = new cv.Scalar(0, 255, 0);
    colors.blue = new cv.Scalar(0, 0, 255);

    const testOutput = document.getElementById('testOutput');
    if (testOutput.style.display !== 'none') {
      setTimeout(() => test(640, 480), 100);
    }

    // setInterval(() => {
    //   window.gc();
    // }, 20_000);
  },
};

function printError(err) {
  if (typeof err === 'number') {
    console.error(cv.exceptionFromPtr(err).msg);
  } else if (typeof err === 'string') {
    const ptr = Number(err.split(' ')[0]);
    if (!Number.isNaN(ptr)) {
      console.error(cv.exceptionFromPtr(ptr).msg);
    }
  } else {
    console.error(err);
  }
}

// eslint-disable-next-line complexity
async function processVideoFrame(mode = 'gray') {
  const size = processParams.blurSize;
  const blurSize = new cv.Size(size, size);
  const kernel = cv.Mat.ones(processParams.kernel, processParams.kernel, cv.CV_8U);
  const anchor = new cv.Point(-1, -1);
  videoData.cap.read(videoData.src);
  if (isTest && calibrationData.calibrating) {
    drawTestLed(videoData.src);
  }

  if (mode === 'gray') {
    cv.cvtColor(videoData.src, videoData.dst, cv.COLOR_RGBA2GRAY, 0);
  } else {
    const rgbaPlanes = new cv.MatVector();
    const mergedPlanes = new cv.MatVector();
    cv.split(videoData.src, rgbaPlanes);
    const r = rgbaPlanes.get(0);
    const g = rgbaPlanes.get(1);
    const b = rgbaPlanes.get(2);

    // if (!videoData.showLive) {
    //   console.log('frame', {
    //     color: getCalibrationColor(),
    //     modeColor: calibrationData.color,
    //     mode,
    //     rep: calibrationData.repeatWithNextColor,
    //   });
    // }

    // eslint-disable-next-line default-case
    switch (mode) {
      case 'red': {
        mergedPlanes.push_back(r);
        break;
      }
      case 'green': {
        mergedPlanes.push_back(g);
        break;
      }
      case 'blue': {
        mergedPlanes.push_back(b);
        break;
      }
    }
    cv.merge(mergedPlanes, videoData.dst);
    rgbaPlanes.delete();
    mergedPlanes.delete();
    r.delete();
    g.delete();
    b.delete();
    // cv.cvtColor(videoData.dst, videoData.dst, cv.COLOR_RGBA2GRAY, 0);
    // console.log('!');
  }

  cv.GaussianBlur(videoData.dst, videoData.dst, blurSize, 0, 0, cv.BORDER_DEFAULT);
  cv.threshold(
    videoData.dst,
    videoData.dst,
    processParams.thresh,
    processParams.threshMax,
    cv.THRESH_BINARY,
  );
  cv.erode(videoData.dst, videoData.dst, kernel, anchor, 2);
  cv.dilate(videoData.dst, videoData.dst, kernel, anchor, 4);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(videoData.dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  const points = await getContourPoints(contours);
  for (const point of points) {
    cv.circle(videoData.dst, { x: point.x, y: point.y }, point.r, colors.white);
  }

  // eslint-disable-next-line no-plusplus
  // for (let i = 0; i < contours.size(); ++i) {
  //   const contour = contours.get(i);
  //   const circle = cv.minEnclosingCircle(contour);
  //   points.push({ ...circle.center, r: circle.radius });
  //   cv.circle(videoData.dst, circle.center, circle.radius, colors.white);
  //   contour.delete();
  // }

  contours.delete();
  hierarchy.delete();
  kernel.delete();

  return points;
}

// eslint-disable-next-line complexity
async function getContourPoints(contours) {
  let points = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const circle = cv.minEnclosingCircle(contour);
    points.push({ ...circle.center, r: circle.radius });
    // cv.circle(videoData.dst, circle.center, circle.radius, colors.white);
    contour.delete();
  }
  if (
    calibrationData.manualCorrection &&
    (!points.length || points.length > 1) &&
    !videoData.showLive
  ) {
    points = await getManualPoint();
  }
  if (!points.length) {
    return [];
  }
  const maxRadius = Math.max(...points.map((p) => p.r));
  return points.filter((p) => p.r > maxRadius / calibrationData.calibrationRadiusThreshold);
}

function getManualPoint() {
  startManualPointing();
  return new Promise((resolve) => {
    awaitManualPoint(resolve);
  });
}

function awaitManualPoint(callback) {
  if (calibrationData.manualPoint) {
    stopManualPointing();
    callback(calibrationData.manualPoint);
  } else {
    setTimeout(() => {
      awaitManualPoint(callback);
    }, 30);
  }
}

function startManualPointing() {
  calibrationData.manualPoint = null;
  document.getElementById('nextLed').style = 'display: inline;';
  videoData.videoInput.style = 'border: 2px solid red';
}
function stopManualPointing() {
  videoData.videoInput.style = '';
  document.getElementById('nextLed').style = 'display: none;';
}

async function processVideo() {
  try {
    if (!videoData.streaming) {
      // clean and stop.
      videoData.src.delete();
      videoData.dst.delete();
      return;
    }
    const begin = Date.now();

    if (videoData.showLive) {
      await processVideoFrame(getCalibrationColor());
      cv.imshow('canvasOutput', videoData.dst);
    }

    // schedule the next one
    const delay = 1000 / FPS - (Date.now() - begin);
    setTimeout(processVideo, delay);
  } catch (err) {
    printError(err);
  }
}

function onVideoStarted() {
  videoData.streaming = true;
  videoData.videoInput.width = videoData.videoInput.videoWidth;
  videoData.videoInput.height = videoData.videoInput.videoHeight;
  videoData.src = new cv.Mat(videoData.videoInput.height, videoData.videoInput.width, cv.CV_8UC4);
  videoData.dst = new cv.Mat(videoData.videoInput.height, videoData.videoInput.width, cv.CV_8UC4);
  videoData.cap = new cv.VideoCapture(videoData.videoInput);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  processVideo();
}

function onVideoStopped() {
  videoData.streaming = false;
  videoData.canvasContext.clearRect(
    0,
    0,
    videoData.canvasOutput.width,
    videoData.canvasOutput.height,
  );
}

function startCamera(resolution, videoId) {
  let video = document.getElementById(videoId);
  if (!video) {
    video = document.createElement('video');
  }
  let videoConstraint = constraints[resolution];
  if (!videoConstraint) {
    videoConstraint = true;
  }
  navigator.mediaDevices
    .getUserMedia({
      video: videoConstraint,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
      videoData.video = video;
      videoData.stream = stream;
      video.addEventListener('canplay', onVideoStarted, false);
    })
    .catch((err) => {
      console.error(`Camera Error: ${err.name} ${err.message}`);
    });
}
function stopCamera() {
  if (videoData.video) {
    videoData.video.pause();
    videoData.video.srcObject = null;
    videoData.video.removeEventListener('canplay', onVideoStarted);
  }
  if (videoData.stream) {
    videoData.stream.getVideoTracks()[0].stop();
  }
}

function startCalibration() {
  calibrationData.currentLed = 0;
  calibrationData.calibrating = true;
  buttons.performCalibration.button.innerText = 'Stop calibration';
  doCalibration().catch((err) => console.error(err));
}

function stopCalibration() {
  calibrationData.calibrating = false;
  buttons.performCalibration.button.innerText = 'Start calibration';
  calibrationData.calibrationProgress.innerText = '';
}

function nextLed(points) {
  // console.log('nextLed', {
  //   color: getCalibrationColor(),
  //   modeColor: calibrationData.color,
  //   rep: calibrationData.repeatWithNextColor,
  // });

  if (!points.length && !calibrationData.repeatWithNextColor && repeatWithNextColor) {
    console.log('1');
    calibrationData.calibrationProgress.innerText = `${calibrationData.currentLed}*`;
    calibrationData.repeatWithNextColor = true;
  } else {
    // console.log('2');
    calibrationData.currentLed += 1;
    calibrationData.calibrationProgress.innerText = calibrationData.currentLed;
    calibrationData.repeatWithNextColor = false;
  }
}

async function doCalibration() {
  if (!calibrationData.calibrating) {
    return;
  }

  if (!isTest) {
    await lightOnLed();
  }

  videoData.showLive = false;
  // console.log('doCal', {
  //   color: getCalibrationColor(),
  //   modeColor: calibrationData.color,
  //   rep: calibrationData.repeatWithNextColor,
  // });

  const points = await processVideoFrame(getCalibrationColor());

  if (!calibrationData.data[calibrationData.angle]) {
    calibrationData.data[calibrationData.angle] = {};
  }

  calibrationData.data[calibrationData.angle][calibrationData.currentLed] = points;

  nextLed(points);

  videoData.showLive = true;

  if (calibrationData.currentLed >= leds) {
    stopCalibration();

    // TODO
    console.log(calibrationData.data);
  } else {
    setTimeout(doCalibration, 0);
  }
}

function getCalibrationColor() {
  const { color, repeatWithNextColor } = calibrationData;
  if (color === 'red' || color === 'gray' || !repeatWithNextColor) {
    return color;
  }
  return color === 'blue' ? 'green' : 'blue';
}
function getCalibrationLedColor() {
  const color = getCalibrationColor();
  if (color === 'red') {
    return 'F00';
  }
  if (color === 'green') {
    return '0F0';
  }
  if (color === 'blue') {
    return '00F';
  }
  return 'FFF';
}
async function lightOnLed() {
  // TODO
  // const color = getCalibrationLedColor();
  const color = 'FFF';
  const url = `http://${processParams.treeAddress}/cal?led=${calibrationData.currentLed}&color=${color}`;
  // console.log('after led on', {
  //   color: getCalibrationColor(),
  //   modeColor: calibrationData.color,
  //   rep: calibrationData.repeatWithNextColor,
  // });
  // calibrationData.repeatWithNextColor = false;
  // console.log(url);
  const res = await fetch(url, {
    mode: 'no-cors',
  });
  // console.log(res);
  return new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
}

function generateTestSet() {
  const points = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < leds; i++) {
    points.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * treeRatio * 2,
      radius: Math.random(),
    });
  }

  return points;
}

function cos(angle) {
  return Math.cos((angle * Math.PI) / 180);
}
function sin(angle) {
  return Math.sin((angle * Math.PI) / 180);
}

function getLineByPoints({ p1, p2 }) {
  const maxCVNum = 2 ** 31;
  if (p2.x === p1.x || Math.abs(p2.x - p1.x) < 1 / maxCVNum) {
    return { slope: Infinity, x: p1.x };
  }
  const slope = Math.abs(p2.y - p1.y) > 1 / maxCVNum ? (p2.y - p1.y) / (p2.x - p1.x) : 0;
  return { slope, y0: p1.y - p1.x * slope };
}
function getPerpendicularLine({ line, p }) {
  const slope = line.slope === 0 ? Infinity : -1 / line.slope;
  if (slope === Infinity) {
    return { slope, x: p.x };
  }
  return { slope, y0: p.y - slope * p.x };
}
// eslint-disable-next-line complexity
function getPointByProjection({ projection1, projection2, angle1, angle2 }) {
  const isRight = (angle2 - angle1) % 90 === 0;
  const p11 = { x: projection1 * cos(angle1), y: projection1 * sin(angle1) };
  const p21 = { x: projection2 * cos(angle2), y: projection2 * sin(angle2) };

  let p12;
  let p22;
  if (isRight) {
    p12 = { x: projection1 * cos(angle1), y: projection2 * sin(angle2) };
    p22 = p12;
  } else {
    const l12 = projection1 / cos(angle2 - angle1);
    const l22 = projection2 / cos(angle2 - angle1);
    p12 = { x: l12 * cos(angle2), y: l12 * sin(angle2) };
    p22 = { x: l22 * cos(angle1), y: l22 * sin(angle1) };
  }

  const line1 = getLineByPoints({ p1: p11, p2: p12 });
  const line2 = getLineByPoints({ p1: p21, p2: p22 });
  const { x, y } = getLinesIntersect({ line1, line2 });

  return { x, y, debug: { p11, p12, p21, p22, line1, line2 } };
}
function getPointProjection({ p, a }) {
  const reference = getLineByPoints({ p1: { x: 0, y: 0 }, p2: { x: cos(a), y: sin(a) } });
  const perpendicular = getPerpendicularLine({ line: reference, p });
  const result = getLinesIntersect({ line1: reference, line2: perpendicular });

  return { ...result, debug: { reference, perpendicular } };
}
function getLinesIntersect({ line1, line2 }) {
  if (line1.slope !== line2.slope) {
    if (line1.slope === Infinity || line2.slope === Infinity) {
      if (line1.slope === Infinity) {
        return { x: line1.x, y: line2.slope * line1.x + line2.y0 };
      }
      return { x: line2.x, y: line1.slope * line2.x + line1.y0 };
    }
    const x = (line2.y0 - line1.y0) / (line1.slope - line2.slope);
    return { x, y: line1.slope * x + line1.y0 };
  }

  return { x: undefined, y: undefined };
}

/* tests */

const r = 250;
const size = 10;

function drawTestLed(dst) {
  const testRadius = 10;
  const led = testData[calibrationData.currentLed];

  const box = { h: constraints[resolution].height.exact - 40 };
  box.w = box.h / treeRatio;

  const point = getPointProjection({ p: { x: led.x, y: led.y }, a: calibrationData.angle });
  const projection = (point.x ** 2 + point.y ** 2) ** (1 / 2);

  const y = ((treeRatio - Number(led.z)) / treeRatio) * box.h + 20;
  const x = projection * box.w + constraints[resolution].width.exact / 2 - box.w / 2;

  // const boxHeight = constraints[resolution].height.exact / treeRatio - 40;
  // const x = (1 - projection) * boxHeight + constraints[resolution].width.exact / 2;
  // const y = (treeRatio - Number(led.z)) * boxHeight + 20;
  const radius = Math.max(led.radius * testRadius, 6);
  cv.circle(dst, { x, y }, radius, colors.white, -1);
}

function test(dw = r * 2, dh = r * 2) {
  const dst = cv.Mat.zeros(dh, dw, cv.CV_8UC3);
  // drawCircle({ dst, p: { x: 0, y: 0 }, r, color: colors.white });
  // drawPoint({ dst, p: { x: 0, y: 0 }, color: colors.white });

  // testTriangle(dst);
  // testTest(dst);
  testLeds(dst);
  cv.imshow('testOutput', dst);
  dst.delete();
}

function testLeds(dst) {
  const w = constraints[resolution].width.exact;
  const h = constraints[resolution].height.exact;
  const box = { h: constraints[resolution].height.exact - 40 };
  box.w = box.h / treeRatio;
  cv.line(dst, { x: w / 2, y: 0 }, { x: w / 2, y: h }, colors.white, 1);

  cv.line(
    dst,
    { x: (w - box.w) / 2, y: 20 },
    { x: (w - box.w) / 2, y: box.h + 20 },
    colors.white,
    1,
  );
  cv.line(
    dst,
    { x: (w + box.w) / 2, y: 20 },
    { x: (w + box.w) / 2, y: box.h + 20 },
    colors.white,
    1,
  );
  cv.line(dst, { x: (w - box.w) / 2, y: 20 }, { x: (w + box.w) / 2, y: 20 }, colors.white, 1);
  cv.line(
    dst,
    { x: (w - box.w) / 2, y: box.h + 20 },
    { x: (w + box.w) / 2, y: box.h + 20 },
    colors.white,
    1,
  );
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < leds; i++) {
    drawTestLed(dst);
    // eslint-disable-next-line no-plusplus
    calibrationData.currentLed++;
  }
  calibrationData.currentLed = 0;
}

function testTest(dst) {
  const as = [0, 30, 60, 90, 120, 150, 180, 210];
  const p = { x: 2, y: 5 };

  drawPoint({ dst, p, color: colors.green });
  for (const a of as) {
    const point = getPointProjection({ p, a });

    drawParametricLine({ dst, l1: -r, l2: r, line: point.debug.reference, color: colors.white });
    drawParametricLine({ dst, l1: -r, l2: r, line: point.debug.perpendicular, color: colors.blue });
    drawPoint({ dst, p: point, color: colors.green });
  }
}

function testTriangle(dst) {
  const l1 = (0.32 / 0.5) * size;
  const l2 = (0.3 / 0.5) * size;
  const a1 = 0;
  const a2 = 30;

  // env
  drawLine({
    dst,
    p1: { x: -r * cos(a1), y: -r * sin(a1) },
    p2: { x: r * cos(a1), y: r * sin(a1) },
    color: colors.white,
  });
  drawLine({
    dst,
    p1: { x: -r * cos(a2), y: -r * sin(a2) },
    p2: { x: r * cos(a2), y: r * sin(a2) },
    color: colors.white,
  });

  const point = getPointByProjection({ projection1: l1, projection2: l2, angle1: a1, angle2: a2 });

  const { p11, p12, line1, p21, p22, line2 } = point.debug;
  drawParametricLine({ dst, l1: -size, l2: size, line: line1, color: colors.blue });
  drawParametricLine({ dst, l1: -size, l2: size, line: line2, color: colors.blue });

  drawPoint({ dst, p: p11, color: colors.red });
  drawPoint({ dst, p: p12, color: colors.green });
  drawPoint({ dst, p: p21, color: colors.red });
  drawPoint({ dst, p: p22, color: colors.green });

  drawPoint({ dst, p: point, color: colors.white });
}

function s(p) {
  return { x: f(p.x), y: f(p.y) };
}
function f(v) {
  return r * (v / size + 1);
}
function drawLine({ dst, p1, p2, color }) {
  cv.line(dst, s({ x: p1.x, y: p1.y }), s({ x: p2.x, y: p2.y }), color, 1);
}
function drawParametricLine({ dst, l1, l2, line, color }) {
  if (line.slope === Infinity) {
    drawLine({
      dst,
      p1: { x: line.x, y: l1 },
      p2: { x: line.x, y: l2 },
      color,
    });
  } else {
    drawLine({
      dst,
      p1: { x: l1, y: line.slope * l1 + line.y0 },
      p2: { x: l2, y: line.slope * l2 + line.y0 },
      color,
    });
  }
}
function drawPoint({ dst, p, color }) {
  cv.circle(dst, s(p), 3, color, -1);
}
function drawCircle({ dst, p, r, color, fill = false }) {
  if (fill) {
    cv.circle(dst, s(p), r, color, -1);
  } else {
    cv.circle(dst, s(p), r, color);
  }
}
/* /tests */

/* eslint-enable no-console */
