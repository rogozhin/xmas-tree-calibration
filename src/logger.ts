// import chalk from 'chalk';

const ERROR = {
  code: 'ERROR',
  // styling: chalk.red,
  level: 3,
  reportSeverity: 'error',
  log: true,
};
const WARN = {
  code: 'WARN',
  // styling: chalk.yellow,
  level: 2,
  reportSeverity: 'warning',
  log: true,
};
const INFO = {
  code: 'INFO',
  // styling: chalk.cyan,
  level: 1,
  reportSeverity: 'info',
  log: true,
};
const DEBUG = {
  code: 'DEBUG',
  // styling: chalk.gray,
  level: 0,
  log: true,
};

export function debug(message: string, data?: any) {
  log({ message, level: DEBUG, data });
}
export function info(message: string, data?: any) {
  log({ message, level: INFO, data });
}
export function warn(message: string, data?: any) {
  log({ message, level: WARN, data });
}
export function error(e: Error, options: any = {}) {
  log({
    message: options.message || e.message,
    e,
    level: ERROR,
    context: options.context,
    data: options.data,
  });
}
exports.error = error;
// private

const maxArrayLength = 20;
const maxStringLength = 200;

function log(options: any) {
  const { message, level, data, e } = options;
  if (level.log) {
    // eslint-disable-next-line no-console
    console.log(getMessage({ message, level, data, e }));
  }
}

// eslint-disable-next-line complexity
function replacer(key: string, value: any) {
  if (value instanceof Array && value.length > maxArrayLength) {
    return `(Array[${value.length}])`;
  }
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'string') {
    if (key === 'stack' || key === 'sql') {
      return value;
    }
    if (value.length > maxStringLength) {
      return `${value.substring(0, maxStringLength)}...(${value.length} total chars)`;
    }
  }
  return value;
}

function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular?]';
      }
      seen.add(value);
    }
    return replacer(key, value);
  };
}

function getMessage(options: any) {
  // const requestId = getRequestId();
  const { message, data, e } = options;
  const dataWithError = e ? { ...data, $error: e } : data;
  const body = dataWithError && processBody(dataWithError);
  const parts = [
    new Date().toISOString(),
    // level.styling(level.code),
    // requestId && `requestId:${requestId}`,
    message,
    body,
  ];
  return parts.filter(Boolean).join(' ');
}

function processBody(data: any) {
  if (!data) {
    return '';
  }
  return JSON.stringify(data, getCircularReplacer());
}
