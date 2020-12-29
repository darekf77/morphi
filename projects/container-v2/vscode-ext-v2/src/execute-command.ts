import * as vscode from 'vscode';
import * as path from 'path';
import * as fse from 'fs';
import * as child from 'child_process';
import { window, ProgressLocation } from 'vscode';
import { ProcesOptions, ProgressData, ResolveVariable } from './models';
import {
  capitalizeFirstLetter, optionsFix, Log, getModuleName,
  fixJSONString, escapeStringForRegEx, deepClone
} from './helpers';

const log = Log.instance(`execute-command`, 'logmsg');

export function executeCommand(registerName: string, commandToExecute: string | string[],
  pOptions?: ProcesOptions, isDefaultBuildCommand?: boolean, context?: vscode.ExtensionContext) {

  const commandToExecuteReadable = '"' +
    (
      (Array.isArray(commandToExecute) ? commandToExecute.join(',') : commandToExecute)
    )
    + '"';


  return vscode.commands.registerCommand(registerName, function (uri) {
    const options = optionsFix(deepClone(pOptions));
    let progressLocation = ProgressLocation.Notification;
    if (options.progressLocation === 'statusbar') {
      progressLocation = ProgressLocation.Window;
    }

    let { findNearestProject, findNearestProjectType, reloadAfterSuccesFinish,
      findNearestProjectTypeWithGitRoot, findNearestProjectWithGitRoot,
      syncProcess, cancellable, title, tnpNonInteractive, askBeforeExecute, resolveVariables,
      tnpShowProgress, showOutputDataOnSuccess, showSuccessMessage } = options;

    //#region prevent incorrect uri
    if (typeof uri === 'undefined') {
      if (vscode.window.activeTextEditor) {
        uri = vscode.window.activeTextEditor.document.uri;
      }
    }
    //#endregion

    //#region  resovle cwd, relative path
    log.data(`root path ${vscode.workspace.rootPath?.toString()}`);
    var relativePathToFileFromWorkspaceRoot = uri ? vscode.workspace.asRelativePath(uri) : '';
    log.data(`relativePath: '${relativePathToFileFromWorkspaceRoot}' `);
    const isAbsolute = !uri ? true : path.isAbsolute(relativePathToFileFromWorkspaceRoot);
    log.data(`isAbsolute: ${isAbsolute} `);
    relativePathToFileFromWorkspaceRoot = relativePathToFileFromWorkspaceRoot.replace(/\\/g, '/');
    log.data(`relativePath replaced \ '${relativePathToFileFromWorkspaceRoot}' `);
    const cwd = vscode.workspace.rootPath;
    log.data(`cwd: ${cwd} `);
    if (typeof cwd !== 'string') {
      log.error(`Not able to get cwd`);
      return;
    }
    //#endregion

    //#region handle first asking about executing command
    if (askBeforeExecute) {
      const continueMsg = `Continue: ` + (title ? title : `command: ${commandToExecuteReadable}`);
      window.showQuickPick(['Abort', continueMsg], {
        canPickMany: false,
      }).then((data) => {
        if (data === continueMsg) {
          process();
        }
      });
    } else {
      process();
    }
    //#endregion

    async function process() {
      const mainTitle = capitalizeFirstLetter(title ? title : `Executing: ${commandToExecuteReadable}`);
      window.withProgress({
        //#region initialize progress
        location: progressLocation,
        title: mainTitle,
        cancellable,
        //#endregion
      }, (progress, token) => {


        progress.report({ increment: 0 });

        var endPromise = new Promise(async (resolve, reject) => {
          let dataToDisplayInLog = '';

          //#region select resolving
          const resolveVars: ResolveVariable[] = [
            {
              variable: 'relativePath',
              variableValue: relativePathToFileFromWorkspaceRoot
            } as any,
          ];
          if (resolveVariables) {
            for (let index = 0; index < resolveVariables.length; index++) {
              const item = resolveVariables[index];
              //#region apply previous resolved vars
              resolveVars.forEach(resolved => {
                [
                  'exitWithMessgeWhenNoOptions',
                  'resolveValueFromCommand',
                  'options',
                  'placeholder',
                  'prompt'
                ].forEach(stringKey => {
                  // @ts-ignore
                  let propValue = item[stringKey];
                  // @ts-ignore
                  if (typeof propValue === 'string') {
                    // @ts-ignore
                    propValue = propValue.replace(
                      new RegExp(escapeStringForRegEx(`%${resolved.variable}%`), 'g'),
                      resolved.variableValue
                    );
                    // @ts-ignore
                    item[stringKey] = propValue;
                  }
                });
              });
              //#endregion
              const { placeholder, prompt } = item;
              let placeHolder;
              if (typeof placeholder === 'string') {
                placeHolder = placeholder;
              }

              if (item.options) {
                if (typeof item.options === 'string') {
                  try {
                    const cmdToExec = item.options.replace(`%relativePath%`, relativePathToFileFromWorkspaceRoot);
                    log.data(`cmdToExec: ${cmdToExec}`)
                    const res = fixJSONString(child.execSync(cmdToExec, { cwd, maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' }));
                    item.optionsResolved = JSON.parse(res);
                  } catch (error) {
                    item.optionsResolved = [] as any;
                    window.showInformationMessage(`There is nothing baseline fork that matches:`
                      + ` "${path.basename(relativePathToFileFromWorkspaceRoot)}"`)
                    reject();
                    return;
                  }
                } else {
                  item.optionsResolved = JSON.parse(JSON.stringify(item.options));
                }

                if (typeof placeholder === 'function') {
                  placeHolder = placeholder({ relativePath: relativePathToFileFromWorkspaceRoot, cwd, path, options: item.optionsResolved });
                }
                const itemForQuicPick = item.optionsResolved.slice(0, 20);
                if (item.exitWithMessgeWhenNoOptions && itemForQuicPick.length === 0) {
                  window.showInformationMessage(item.exitWithMessgeWhenNoOptions);
                  resolve();
                  return;
                } else {
                  const res = await window.showQuickPick(itemForQuicPick, {
                    canPickMany: false,
                    placeHolder,
                    ignoreFocusOut: true,
                  });
                  item.variableValue = res?.option;
                }

                log.data(`Resolve from select: ${item.variableValue}`);


              } else {
                if (typeof placeholder === 'function') {
                  placeHolder = placeholder({ relativePath: relativePathToFileFromWorkspaceRoot, cwd, path });
                }
                let res: string | undefined;
                if (item.resolveValueFromCommand) {
                  try {
                    res = child.execSync(item.resolveValueFromCommand, { cwd, encoding: 'utf8' }).toString().trim();
                  } catch (err) {
                    reject();
                    return;
                  }
                } else {
                  res = await vscode.window.showInputBox({
                    value: placeHolder,
                    placeHolder,
                    ignoreFocusOut: true,
                    prompt
                  });
                }
                res = !res ? '' : res;
                item.variableValue = res;
                log.data(`Resolve from input: ${item.variableValue}`)
              }
              if (!item.variableValue) {
                reject();
                return;
              }
              if (item.useResultAsLinkAndExit) {
                try {
                  // @ts-ignore
                  child.execSync(`navi goto ${item.variableValue}`);
                } catch (error) { }
                resolve();
                return;
              }
              resolveVars.push(item);
            }
          }
          //#endregion

          //#region endactions
          function finishAction(childResult: any) {
            if (reloadAfterSuccesFinish) {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            } else {
              if (showSuccessMessage) {
                let doneMsg = title ? title : `command: ${commandToExecuteReadable}`;
                const message = `Done executing ${doneMsg}.\n\n` + (childResult ? childResult.toString() : '');
                log.data(message);
                window.showInformationMessage(message);
              }
            }
            resolve();
          }

          function finishError(err: any, data?: string) {
            let doneMsg = title ? title : `command: ${commandToExecuteReadable}`;
            const message = `Execution of ${doneMsg} failed:\n ${commandToExecuteReadable}
            ${err}
            ${data}
            `;
            log.error(message);
            window.showErrorMessage(message);
            resolve();
          }
          //#endregion

          //#region cancle action
          token.onCancellationRequested(() => {
            if (proc) {
              proc.kill('SIGINT');
            }
            const message = `User canceled command: ${commandToExecuteReadable}`;
            log.data(message);
            window.showWarningMessage(message);
          });
          //#endregion

          //#region resolving cwd
          try {
            let newCwd = isAbsolute ? cwd : path.join(cwd as string, relativePathToFileFromWorkspaceRoot);
            log.data(`first newCwd : ${newCwd}, relativePath: "${relativePathToFileFromWorkspaceRoot}"`)
            if (!fse.existsSync(newCwd as string)) {
              // QUICK_FIX for vscode workspace
              const cwdBase = path.basename(cwd as string);
              log.data(`cwdBase ${cwdBase}`)
              const testCwd = (newCwd as string).replace(`/${cwdBase}/${cwdBase}/`, `/${cwdBase}/`);
              if (fse.existsSync(testCwd)) {
                log.data(`cwdBaseExists`);
                newCwd = testCwd;
              }
            }
            log.data(`newCwd: ${newCwd}`)
            if (fse.existsSync(newCwd as string)) {
              if (!fse.lstatSync(newCwd as string).isDirectory()) {
                newCwd = path.dirname(newCwd as string);
              }
            } else {
              const cwdFixed = (typeof newCwd === 'string') ? path.dirname(newCwd) : void 0;
              if (cwdFixed && fse.existsSync(cwdFixed) && fse.lstatSync(cwdFixed).isDirectory()) {
                newCwd = cwdFixed;
                log.data(`newCwd fixed: ${newCwd}`)
              } else {
                window.showErrorMessage(`[vscode] Cwd not found: ${newCwd}`);
                resolve();
                return;
              }
            }
            //#endregion

            //#region applying flags
            const flags = [
              tnpShowProgress && '--tnpShowProgress',
              tnpNonInteractive && '--tnpNonInteractive',
              findNearestProject && '--findNearestProject',
              findNearestProjectWithGitRoot && '--findNearestProjectWithGitRoot',
              findNearestProjectType && `--findNearestProjectType=${findNearestProjectType}`,
              findNearestProjectTypeWithGitRoot && `--findNearestProjectTypeWithGitRoot=${findNearestProjectTypeWithGitRoot}`,
              '-dist',
              '-verbose'
            ].filter(f => !!f).join(' ');

            let cmd = (typeof commandToExecute === 'string') ? `${commandToExecute} --cwd ${newCwd} ${flags}` :
              commandToExecute.map(c => `${c} --cwd ${newCwd} ${flags}`).join(' && ');
            //#endregion

            log.data(`commandToExecuteReadable before: ${commandToExecuteReadable}`);

            let execCommand = commandToExecuteReadable;

            //#region handle %paramName% variables
            const execParams = execCommand.match(/\%[a-zA-Z]+\%/g);
            if (Array.isArray(execParams) && execParams.length > 0) {
              for (let index = 0; index < execParams.length; index++) {
                const paramToResolve = execParams[index];
                if (paramToResolve === '%name%' && resolveVariables &&
                  (typeof resolveVariables.find(({ variable }) => variable === 'name') === 'undefined')
                ) {
                  const name = await getModuleName();
                  execCommand = execCommand
                    .replace(paramToResolve, name);
                  cmd = cmd
                    .replace(paramToResolve, name);

                }

                if (paramToResolve === '%absolutePath%') {
                  // @ts-ignore
                  const absolutePath = path.join(cwd, relativePathToFileFromWorkspaceRoot);
                  execCommand = execCommand.replace(paramToResolve, absolutePath);
                  cmd = cmd.replace(paramToResolve, absolutePath);
                }
                if (paramToResolve === '%relativePath%') {
                  log.data(`paramToResolve: '${paramToResolve}'`);
                  log.data(`relativePath: '${relativePathToFileFromWorkspaceRoot}'`);
                  execCommand = execCommand.replace(paramToResolve, relativePathToFileFromWorkspaceRoot);
                  cmd = cmd.replace(paramToResolve, relativePathToFileFromWorkspaceRoot);
                }
                if (paramToResolve === '%relativePathDirname%') {
                  execCommand = execCommand.replace(paramToResolve, path.dirname(relativePathToFileFromWorkspaceRoot));
                  cmd = cmd.replace(paramToResolve, path.dirname(relativePathToFileFromWorkspaceRoot));
                }
              }
              if (resolveVariables) {
                for (let index = 0; index < resolveVariables.length; index++) {
                  const { variable, variableValue } = resolveVariables[index];
                  const variableInsidPrecentSign = `%${variable}%`;
                  execCommand = execCommand.replace(variableInsidPrecentSign, variableValue);
                  cmd = cmd.replace(variableInsidPrecentSign, variableValue);
                }
              }
            }
            //#endregion

            log.data(`cmd after replacing: ${cmd}`);
            log.data(`execCommand after replacing: ${execCommand}`);

            dataToDisplayInLog += `commandToExecute: ${execCommand}`;

            if (syncProcess) {
              //#region handle sync process
              let childResult = child.execSync(cmd);
              progress.report({ increment: 50 });
              if (typeof childResult !== 'object') {
                throw `Child result is not a object`
              }
              progress.report({ increment: 50 });
              finishAction(showOutputDataOnSuccess ? childResult : '');
              //#endregion
            } else {
              //#region handle async process events
              if (isDefaultBuildCommand) {
                var outputChannel = vscode.window.createOutputChannel('FIREDEV CLI');
                outputChannel.show();
              }

              var proc = child.exec(cmd, { cwd });
              if (!proc) {
                await window.showErrorMessage(`Incorrect execution of: ${cmd}`);
                return;
              }
              // @ts-ignore
              proc.stdout.on('data', (message) => {
                // tslint:disable-next-line: no-unused-expression
                log.data(message.toString());
                if (isDefaultBuildCommand) {
                  outputChannel.appendLine(message.toString().trim());
                } else {
                  dataToDisplayInLog += message.toString();
                  ProgressData.resolveFrom(message.toString(), (json) => {
                    progress.report({ message: json.msg, increment: json.value / 100 });
                  });
                }

              });

              // @ts-ignore
              proc.stdout.on('error', (err) => {
                // tslint:disable-next-line: no-unused-expression
                if (isDefaultBuildCommand) {
                  outputChannel.appendLine(err.toString().trim());
                } else {
                  dataToDisplayInLog += err.toString();
                  window.showErrorMessage(`Error: ${JSON.stringify(err, null, 2)}`)
                }

              });

              // @ts-ignore
              proc.stderr.on('data', (message) => {
                // tslint:disable-next-line: no-unused-expression
                const msg = message.toString();

                if (msg.search('UnhandledPromiseRejectionWarning: Error') !== -1) {
                  if (isDefaultBuildCommand) {
                    outputChannel.appendLine(msg.toString().trim());
                  } else {
                    dataToDisplayInLog += msg.toString();
                    window.showErrorMessage(`Error: \n${msg}`)
                  }
                  finishError(`Command crashed with message: \n ${msg}`, dataToDisplayInLog);
                } else {
                  if (isDefaultBuildCommand) {
                    outputChannel.appendLine(message.toString().trim());
                  } else {
                    dataToDisplayInLog += message.toString();
                    ProgressData.resolveFrom(message.toString(), (json) => {
                      progress.report({ message: json.msg, increment: json.value / 100 });
                    });
                  }
                }

              });

              // @ts-ignore
              proc.stderr.on('error', (err) => {
                // tslint:disable-next-line: no-unused-expression
                if (isDefaultBuildCommand) {
                  outputChannel.appendLine(err.toString().trim());
                } else {
                  dataToDisplayInLog += (err.toString());
                  window.showErrorMessage(`Error: ${JSON.stringify(err, null, 2)}`);
                }
              });
              proc.on('exit', (code) => {
                if (isDefaultBuildCommand) {
                  outputChannel.appendLine(`--- BUILD TASK ENDED --- code ${code}`.trim());
                  resolve();
                } else {
                  if (code == 0) {
                    finishAction(showOutputDataOnSuccess ? dataToDisplayInLog : '');
                  } else {
                    finishError(`Command exited with code: ${code}`, dataToDisplayInLog);
                  }
                }

              });
              //#endregion
            }

          } catch (err) {
            finishError(err, dataToDisplayInLog);
          }
        });
        return endPromise;
      });
    }

  });
}
