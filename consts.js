/*

Owen Gallagher
2020-10-13

*/

// external imports

import readline from 'readline'

// constants

export const PROGRAM_NAME = 'eavesdrop'

let os_name = process.platform
if (os_name == 'darwin') {
	os_name = 'mac'
}
else if (os_name == 'win32') {
	os_name = 'win'
}
else {
	os_name = 'other'
}
export const OS_NAME = os_name

export const TEST_DIR_PATH = './dir/'
export const TEST_FILE_PATH = TEST_DIR_PATH + 'file.txt'

export const RESOURCES_DIR_PATH = './resources/'
export const CONFIG_PATH = RESOURCES_DIR_PATH + 'config.json'

export const SECRETS_PATH = './secrets/'
export const CREDENTIALS_PATH = SECRETS_PATH + 'credentials.json'

export const LOCALE_DIR_PATH = './locales/'

export const RESULTS_DIR_PATH = './results/'
export const VIDEO_PLAYER_PATH = RESULTS_DIR_PATH + 'video_player.html'

export const LOG_LEVEL = {
	'off': -2,
	'critical': -1,
	'error': 0,
	'warning': 1,
	'info': 2,
	'debug': 3
}

export const CMD_PREFIX = '$'

export const CMDS = [
	'h','help',
	'q','quit'
]

export const CLI = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

export const HTTP_STATUS_OK = 200

export const VIDEO_HEIGHT = 200

export const API_QUOTA_YOUTUBE = 10000
export const APIU_YTB_SEARCH = 100
export const APIU_YTB_CAPTIONS_LIST = 50
export const APIU_YTB_CAPTIONS_DOWNLOAD = 200
