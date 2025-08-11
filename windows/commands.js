import { execa } from 'execa';
import { SCREENSHOTS_ACTIONS } from './constants.js';
import { SCREENSHOTS_DIR } from '../config.js';

/**
 * @typedef {keyof typeof SCREENSHOTS_ACTIONS} ActionKey
 * @typedef {typeof SCREENSHOTS_ACTIONS[ActionKey]} Action
 */

/**
 * @param {string} processId
 * @param {Action} action
 */
export async function execWinCommands(processId, action) {
  const { stdout } = await execa(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'C:\\Users\\Frank\\github\\mu-win\\screenshots.ps1',
      '-Action',
      action,
      '-ProcessId',
      processId,
      '-OutputDir',
      SCREENSHOTS_DIR.replaceAll('/', '\\'),
    ],
    { stdio: 'inherit' }
  );
  console.log(stdout);
}
