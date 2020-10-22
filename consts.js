/*

Owen Gallagher
2020-10-13

*/

// external imports

import readline from 'readline'

// constants

export const PROGRAM_NAME = 'eavesdrop'
export const TEST_DIR_PATH = './dir/'
export const TEST_FILE_PATH = TEST_DIR_PATH + 'file.txt'

export const LOG_LEVEL = {
	'off': -2,
	'critical': -1,
	'error': 0,
	'warning': 1,
	'info': 2,
	'debug': 3
}

export const SECRETS_PATH = './secrets/'
export const CREDENTIALS_PATH = SECRETS_PATH + 'credentials.json'

export const CMD_PREFIX = '$'

export const CMDS = [
	'h','help',
	'q','quit'
]

export const CLI = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

export const LOCALE_DIR = './locales/'
