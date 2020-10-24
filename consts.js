/*

Owen Gallagher
2020-10-13

*/

// external imports

import readline from 'readline'

// configurable constants

export let PROGRAM_NAME = 'eavesdrop'

export let OS_NAME = process.platform
if (OS_NAME == 'darwin') {
	OS_NAME = 'mac'
}
else if (OS_NAME == 'win32') {
	OS_NAME = 'win'
}
else {
	OS_NAME = 'other'
}

export let TEST_DIR_PATH = './dir/'
export let TEST_FILE_PATH = TEST_DIR_PATH + 'file.txt'

export let RESOURCES_DIR_PATH = './resources/'
export let CONFIG_PATH = RESOURCES_DIR_PATH + 'config.json'

export let SECRETS_PATH = './secrets/'
export let CREDENTIALS_PATH = SECRETS_PATH + 'credentials.json'

export let LOCALE_DIR_PATH = './locales/'

export let RESULTS_DIR_PATH = './results/'
export let VIDEO_PLAYER_PATH = RESULTS_DIR_PATH + 'video_player.html'

export let CMD_PREFIX = '$'

export let HTTP_STATUS_OK = 200

export let VIDEO_HEIGHT = 200

export let API_QUOTA_YOUTUBE = 10000
export let APIU_YTB_SEARCH = 100
export let APIU_YTB_VIDEOS_LIST = 1
export let APIU_YTB_CAPTIONS_LIST = 50
export let APIU_YTB_CAPTIONS_DOWNLOAD = 200

// constants

export const LOG_LEVEL = {
	'off': -2,
	'critical': -1,
	'error': 0,
	'warning': 1,
	'info': 2,
	'debug': 3
}

export const CMDS = [
	'h','help',
	'q','quit'
]

export const CLI = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

export function config(config) {
	let c = config.constants
	let v = undefined
	let i = 0
	
	if (c != undefined) {
		v = c.PROGRAM_NAME
		if (v) {
			PROGRAM_NAME = v
			i++
		}
		
		v = c.OS_NAME
		if (v) {
			OS_NAME = v
			i++
		}
		
		v = c.TEST_DIR_PATH
		if (v) {
			TEST_DIR_PATH = v
			i++
		}
		v = c.TEST_FILE_NAME
		if (v) {
			TEST_FILE_PATH = TEST_DIR_PATH + v
			i++
		}
		
		v = c.RESOURCES_DIR_PATH
		if (v) {
			RESOURCES_DIR_PATH = v
			i++
		}
		v = c.CONFIG_NAME
		if (v) {
			CONFIG_PATH = RESOURCES_DIR_PATH + v
			i++
		}
		
		v = c.SECRETS_PATH
		if (v) {
			SECRETS_PATH = v
			i++
		}
		v = c.CREDENTIALS_NAME
		if (v) {
			CREDENTIALS_PATH = SECRETS_PATH + v
			i++
		}
		
		v = c.LOCALE_DIR_PATH
		if (v) {
			LOCALE_DIR_PATH = v
			i++
		}
		
		v = c.RESULTS_DIR_PATH
		if (v) {
			RESULTS_DIR_PATH = v
			i++
		}
		v = c.VIDEO_PLAYER_NAME
		if (v) {
			VIDEO_PLAYER_PATH = RESULTS_DIR_PATH + v
			i++
		}
		
		v = c.CMD_PREFIX
		if (v) {
			CMD_PREFIX = v
			i++
		}
		
		v = c.HTTP_STATUS_OK
		if (v) {
			HTTP_STATUS_OK = v
			i++
		}
		
		v = c.VIDEO_HEIGHT
		if (v) {
			VIDEO_HEIGHT = v
			i++
		}
		
		v = c.API_QUOTA_YOUTUBE
		if (v) {
			API_QUOTA_YOUTUBE = v
			i++
		}
		v = c.APIU_YTB_SEARCH
		if (v) {
			APIU_YTB_SEARCH = v
			i++
		}
		v = c.APIU_YTB_CAPTIONS_LIST
		if (v) {
			APIU_YTB_CAPTIONS_LIST = v
			i++
		}
		v = c.APIU_YTB_CAPTIONS_DOWNLOAD
		if (v) {
			APIU_YTB_CAPTIONS_DOWNLOAD = v
			i++
		}
	}
	
	console.log(`set ${i} constants from config file at ${CONFIG_PATH}`)
}