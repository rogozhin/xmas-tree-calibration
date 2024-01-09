/* eslint-disable no-plusplus */

const matrixSize = process.env.MATRIX_SIZE ? Number(process.env.MATRIX_SIZE) : 8;

const angles: number[][] = [];

for (let i = 0; i < matrixSize; i++) {
  angles[i] = [];
  for (let j = 0; j < matrixSize; j++) {
    const x = i - (matrixSize - 1) / 2;
    const y = j - (matrixSize - 1) / 2;
    const angle = (180 * -Math.atan2(y, x)) / Math.PI + 90;
    const convertedAngle = Math.round(((angle + 180) / 360) * 255) % 256;
    angles[i][j] = convertedAngle;
  }
}

// eslint-disable-next-line no-console
console.log(angles.map((row) => `{${row.join(', ')}}`).join(',\n'));

/* eslint-enable no-plusplus */
