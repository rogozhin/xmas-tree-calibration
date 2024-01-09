/* eslint-disable no-continue, no-plusplus */

interface CalPoint {
  x: number;
  y: number;
  r: number;
}
interface Point {
  x: number;
  y: number;
}
interface Point3D {
  x: number;
  y: number;
  z: number;
}
interface Line {
  slope: number;
  x?: number;
  y0?: number;
}
interface Projections {
  projection1: number;
  projection2: number;
  angle1: number;
  angle2: number;
}
type CalAngleData = Record<string, CalPoint[]>;
type CalData = Record<string, CalAngleData>;
type CalAngleResultData = Record<string, CalPoint>;
type CalResultData = Record<string, CalAngleResultData>;
type Matrix = number[][][][];

const leds = process.env.LEDS ? Number(process.env.LEDS) : 500;
const matrixSize = process.env.MATRIX_SIZE ? Number(process.env.MATRIX_SIZE) : 8;
const treeRatio = process.env.TREE_RATIO ? Number(process.env.TREE_RATIO) : 2;

const args = process.argv.slice(2);
if (!args[0]) {
  // eslint-disable-next-line no-console
  console.error('No data file specified');
  process.exit(1);
}
// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
const { dataSet } = require(`./${args[0]}`);
const sizeThreshold = 2;
const onlyMaxSize = true;
const yThreshold = 1.2;

function parseData(data: CalData) {
  const preparedPoints = preparePoints(data);
  // console.log('data', preparedPoints);
  const points = getPoints(preparedPoints);
  const result = spreadPoints(points);
  return result;
}

function preparePoints(data: CalData) {
  const result: CalResultData = {};
  for (const [angle, angleData] of Object.entries(data)) {
    const points: CalAngleData = {};
    for (const [led, ledPoints] of Object.entries(angleData)) {
      if (!ledPoints.length) {
        points[led] = [];
        continue;
      }
      const maxR = Math.max(...ledPoints.map((p) => p.r));
      points[led] = ledPoints.filter((p) =>
        onlyMaxSize ? p.r === maxR : p.r > maxR / sizeThreshold,
      );
      // TODO filter if more then 1 point
    }
    result[angle] = normalizePoints(points);
  }
  return result;
}

function getPoints(data: CalResultData) {
  interface Angles {
    a1: number;
    a2: number;
  }
  const result: (Point3D | null)[] = [];
  const angles = Object.keys(data);
  const anglesVar: Angles[] = angles
    .reduce(
      (r, a1) => [...r, ...angles.map((a2) => ({ a1: Number(a1), a2: Number(a2) }))],
      [] as Angles[],
    )
    .filter(({ a1, a2 }) => a1 < a2 && (a2 - a1) % 180 !== 0);
  for (let ledNum = 0; ledNum < leds; ledNum++) {
    const led = angles.map((angle) => data[angle][ledNum]);
    const ys = led.filter((p) => p !== null && p !== undefined).map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    if (ys.length < 2) {
      result[ledNum] = null;
      continue;
    }
    if (maxY - minY > yThreshold) {
      result[ledNum] = null;
      continue;
    }

    const xs = anglesVar
      .map((as) =>
        data[as.a1][ledNum] && data[as.a2][ledNum]
          ? { ...as, p1: data[as.a1][ledNum].x, p2: data[as.a2][ledNum].x }
          : null,
      )
      .filter(Boolean)
      .map((p) =>
        getAndFilterPointByProjections({
          projection1: p!.p1,
          projection2: p!.p2,
          angle1: Number(p!.a1),
          angle2: Number(p!.a2),
        }),
      )
      .filter(Boolean);

    result[ledNum] = {
      x: xs.reduce((s, v) => s + v!.x, 0) / xs.length,
      y: xs.reduce((s, v) => s + v!.y, 0) / xs.length,
      z: ys.reduce((s, v) => s + v, 0) / ys.length,
    };
  }
  return result;
}

function spreadPoints(points: (Point3D | null)[]) {
  const basis = 2;
  const scale = basis / matrixSize;
  const result: Matrix = Array(matrixSize);
  // eslint-disable-next-line complexity
  points.forEach((point, i) => {
    if (!point) {
      return;
    }
    const x =
      point.x === matrixSize / 2 ? matrixSize - 1 : Math.floor((point.x + basis / 2) / scale);
    const y =
      point.y === matrixSize / 2 ? matrixSize - 1 : Math.floor((point.y + basis / 2) / scale);
    const z =
      point.z === matrixSize * treeRatio ? matrixSize * treeRatio - 1 : Math.floor(point.z / scale);

    if (!result[x]) {
      result[x] = Array(matrixSize);
    }
    if (!result[x][y]) {
      result[x][y] = Array(matrixSize * treeRatio);
    }
    if (!result[x][y][z]) {
      result[x][y][z] = [];
    }

    result[x][y][z].push(i);
  });
  return result;
}

function normalizePoints(points: CalAngleData) {
  const allPoints = Object.values(points).reduce((r, points) => [...r, ...points], []);
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));

  const result: CalAngleResultData = {};

  for (const [led, ledPoints] of Object.entries(points)) {
    if (!ledPoints.length) {
      // result[led] = null;
      continue;
    }
    result[led] = {
      x: ((ledPoints[0].x - (minX + maxX) / 2) / (maxX - minX)) * 2,
      y: (1 - (ledPoints[0].y - minY) / (maxY - minY)) * treeRatio * 2,
      r: ledPoints[0].r,
    };
  }

  return result;
}

function cos(angle: number) {
  return Math.cos((angle * Math.PI) / 180);
}
function sin(angle: number) {
  return Math.sin((angle * Math.PI) / 180);
}

function getLineByPoints({ p1, p2 }: { p1: Point; p2: Point }) {
  const maxCVNum = 2 ** 31;
  if (p2.x === p1.x || Math.abs(p2.x - p1.x) < 1 / maxCVNum) {
    return { slope: Infinity, x: p1.x };
  }
  const slope = Math.abs(p2.y - p1.y) > 1 / maxCVNum ? (p2.y - p1.y) / (p2.x - p1.x) : 0;
  return { slope, y0: p1.y - p1.x * slope };
}
function getLinesIntersect({ line1, line2 }: { line1: Line; line2: Line }) {
  if (line1.slope !== line2.slope) {
    if (line1.slope === Infinity || line2.slope === Infinity) {
      if (line1.slope === Infinity) {
        return { x: line1.x, y: line2.slope * line1.x! + line2.y0! };
      }
      return { x: line2.x, y: line1.slope * line2.x! + line1.y0! };
    }
    const x = (line2.y0! - line1.y0!) / (line1.slope - line2.slope);
    return { x, y: line1.slope * x + line1.y0! };
  }

  return { x: undefined, y: undefined };
}

// eslint-disable-next-line complexity
function getAndFilterPointByProjections(params: Projections) {
  const result = getPointByProjections(params);
  const t = 1.5;
  if (
    result.x === undefined ||
    result.y === undefined ||
    result.x < -t ||
    result.x > t ||
    result.y < -t ||
    result.y > t
  ) {
    return null;
  }
  return { x: result.x, y: result.y };
}
// eslint-disable-next-line complexity
function getPointByProjections({ projection1, projection2, angle1, angle2 }: Projections) {
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

function printC(data: Matrix) {
  /* eslint-disable no-console */
  data.forEach((ys, x) => {
    console.log(`if (x == ${x}) {`);
    ys.forEach((zs, y) => {
      console.log(`  if (y == ${y}) {`);
      zs.forEach((ps, z) => {
        console.log(`    if (z == ${z}) {`);
        if (!ps) {
          // console.log('static uint16_t a[1] = {0}; return a;');
        } else {
          const size = ps.length;
          console.log(`      static uint16_t a[] = {${size}, ${ps.join(', ')}}; return a;`);
        }
        console.log('    }');
      });
      console.log('  }');
    });
    console.log('}');
  });
  /* eslint-enable no-console */
}

const data = parseData(dataSet);
printC(data);

/* eslint-enable no-continue, no-plusplus */
