# XMAS-tree calibration

This set of pages and scripts allows to track leds on tree and generate CPP code to put into [XMAS-tree](https://github.com/rogozhin/xmas-tree).

## how to use
Create _.env_ file with tree settings (check _.env-example_).

Start the server: `npm npm run start:dev`

Now on `http://localhost:3000` page you can track leds. Data will appear in `calibrationData.data`.

Put data to _process/data.XXX.ts_ (check existing examples) and run `npm run process data.XXX.ts`, result should be putted into `getMatrixLeds` of _led_matrix.hpp_.

Also, run `npm run process:angles` and put the results into `ledAngles` of _led_matrix.hpp_.
