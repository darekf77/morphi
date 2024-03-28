// //#region quick fixes
// Error.stackTraceLimit = 100;
// global.i0 = {
//   defineInjectable: function () { }
// }
// //#endregion

// //#region resolve args
// const childprocsecretarg = '-childproc';
// const isWinGitBash = (process.platform === 'win32');
// const procType = (process.argv[1].endsWith('tnp') || process.argv[1].endsWith('firedev')) ? 'root'
//   : ((process.argv.find(a => a.startsWith(childprocsecretarg)))
//     ? 'child-of-root'
//     : 'child-of-child'
//   );
// const debugMode = (process.argv[1].endsWith('-debug') || process.argv[1].endsWith('-debug-brk'))
// global.spinnerInParentProcess = (procType === 'child-of-root');
// const orgArgv = JSON.parse(JSON.stringify(process.argv));
// global.tnpNonInteractive = (typeof process.argv.find(a => a.startsWith('--tnpNonInteractive')) !== 'undefined');
// const spinnerIsDefault = !tnpNonInteractive;

// global.globalSystemToolMode = true;
// const verbose = process.argv.includes('-verbose')
// global.hideLog = !verbose;
// global.verboseLevel = 0;
// global.skipCoreCheck = (typeof process.argv.find(a => a.startsWith('--skipCoreCheck')) !== 'undefined');
// const verboseLevelExists = (typeof process.argv.find(a => a.startsWith('-verbose=')) !== 'undefined');
// global.verboseLevel = (verboseLevelExists ? Number(
//   process.argv.find(a => {
//     const v = a.startsWith('-verbose=');
//     if (v) {
//       return v.replace('-verbose=', '');
//     }
//   })
// ) : 0) || 0;

// if (!verbose && verboseLevelExists) {
//   global.hideLog = false;
// }
// const spinnerOnInArgs = process.argv.includes('-spinner');
// const spinnerOffInArgs = (process.argv.includes('-spinner=false') || process.argv.includes('-spinner=off'));
// //#endregion

// //#region clear argument from variables
// process.argv = process.argv.filter(a => !a.startsWith('-spinner'));
// process.argv = process.argv.filter(a => a !== '-childproc');
// process.argv = process.argv.filter(a => a !== '--skipCoreCheck');
// process.argv = process.argv.filter(a => !a.startsWith('-verbose'));
// //#endregion


// //#region fix argument
// process.argv = process.argv.map(a => {
//   if (a === '-websql') {
//     return '--websql'
//   }
//   return a;
// })
// //#endregion

// //#region variables
// let mode;
// let start;
// let startSpinner = spinnerIsDefault || spinnerOnInArgs;
// if (spinnerOffInArgs) {
//   startSpinner = false;
// }
// if (procType === 'child-of-root' || debugMode) {
//   startSpinner = false;
// }

// if (verbose || frameworkName === 'tnp' || global.skipCoreCheck) {
//   startSpinner = false;
// }
// //#endregion

// const path = require('path');

// if (procType === 'child-of-root') {
//   global.spinner = {
//     start() {
//       process.send && process.send('start-spinner')
//     },
//     stop() {
//       process.send && process.send('stop-spinner')
//     }
//   }
// }

// if (startSpinner) {
//   //#region start spinner in processs
//   var ora = require('ora');
//   var spinner = ora();
//   spinner.start();
//   global.spinner = spinner;

//   const child_process = require('child_process');
//   const orgArgvForChild = orgArgv.filter(a => !a.startsWith('-spinner'));

//   const env = {
//     ...process.env,
//     FORCE_COLOR: '1'
//   };

//   const cwd = process.cwd();
//   const argsToCHildProc = (`${orgArgvForChild.slice(2).join(' ')} ${global.verbose ? '-verbose' : ''} ${global.skipCoreCheck ? '--skipCoreCheck' : ''} `
//     + `${spinnerOnInArgs ? '-spinner' : (spinnerOffInArgs ? '-spinner=off' : '')} ${childprocsecretarg}`).split(' ');

//   const proc = child_process.fork(crossPlatofrmPath(__filename), argsToCHildProc, {
//     env,
//     stdio: [0, 1, 2, 'ipc'],
//     cwd,
//   });

//   proc.on('exit', (code) => {
//     spinner.stop();
//     setTimeout(() => {
//       process.exit(code);
//     })
//   });

//   proc.on('message', message => {
//     message = (message ? message : '').trimLeft();
//     if (message === 'start-spinner') {
//       spinner.start();
//     } else if (message === 'stop-spinner') {
//       spinner.stop();
//     } else if (message.startsWith('info::')) {
//       setText((message));
//     } else if (message.startsWith('success::')) {
//       setText((message));
//     } else if (message.startsWith('taskstart::')) {
//       setText((message));
//     } else if (message.startsWith('taskdone::')) {
//       setText((message));
//     } else if (message.startsWith('error::')) {
//       setText((message));
//     } else if (message.startsWith('log::')) {
//       setText((message), true);
//     } else if (message.startsWith('warn::')) {
//       setText((message));
//     }
//   });

//   // process.stdin.resume(); // not needed ?
//   //#endregion
// } else {
//   //#region normal start
//   const fs = require('fs');
//   const pathToDistRun = path.join(__dirname, '../dist/cli.js');
//   const pathToIndexRun = path.join(__dirname, '../cli.js');
//   const distExist = fs.existsSync(pathToDistRun);

//   if (distExist) {
//     mode = 'dist';
//     !global.hideLog && setText('- firedev dist -', true);
//     // TODO TOOOO MUCH TIME !!!!!!
//     start = require(pathToDistRun.replace(/\.js$/g, '')).default;
//   } else {
//     mode = 'npm';
//     !global.hideLog && setText('- npm mode -', true);
//     start = require(pathToIndexRun.replace(/\.js$/g, '')).default;
//   }

//   // global.start = start;
//   process.argv = process.argv.filter(f => !!f);
//   start(process.argv?.slice(2), global.frameworkName, mode);
//   //#endregion
// }

// //#region helpers

// function crossPlatofrmPath(p) {
//   if (isWinGitBash) {
//     return p.replace(/\\/g, '/');
//   }
//   return p;
// }

// function setText(text, toSpiner = false) {
//   const spinner = global.spinner;
//   if (text) {
//     text = text.split('::').slice(1).join('::');
//   }
//   if (spinner) {
//     if (toSpiner) {
//       spinner.text = text.replace(/(?:\r\n|\r|\n)/g, ' ');
//     } else {
//       const wasSpinning = spinner.isSpinning;
//       if (wasSpinning) {
//         spinner.stop();
//         spinner.clear();
//       }
//       console.log(text);
//       if (wasSpinning) {
//         spinner.start()
//       }
//     }
//   } else {
//     console.log(text);
//   }

// }
// //#endregion
