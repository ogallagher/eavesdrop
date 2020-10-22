/*

Owen Gallagher
2020-10-13

*/

// external imports

import {
	PROGRAM_NAME,
	CLI,
	CMD_PREFIX
} from './consts.js'

import Logger from './logger.js'

import { 
	log as test_log
} from './tests.js'

import {
	log as api_log
} from './api_client.js'

import {
	log as io_log
} from './io.js'

import {
	log as eavesdrop_log
} from './eavesdrop.js'

// local imports

// constants

const NAME = PROGRAM_NAME + ':util'
export const log = new Logger(NAME)

export function init_loggers(logging_level) {
	log.enable(logging_level)
	test_log.enable(logging_level)
	api_log.enable(logging_level)
	io_log.enable(logging_level)
	eavesdrop_log.enable(logging_level)
}

export function finish() {
	CLI.close()
}

export function eavesdrop_commands_help() {
	return `
eavesdrop commands:
	(${CMD_PREFIX}h | ${CMD_PREFIX}help) = show eavesdrop commands

	(${CMD_PREFIX}q | ${CMD_PREFIX}quit) = quit eavesdrop
`
}

export function do_command(cmd) {
	if (cmd == 'h' || cmd == 'help') {
		console.log(eavesdrop_commands_help())
	}
	else if (cmd == 'q' || cmd == 'quit') {
		finish()
		process.exit()
	}
}
