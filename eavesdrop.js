/*

Owen Gallagher
2020-10-13

*/

// external imports

import fs from 'fs'
import debug from 'debug'
import cli_args from 'command-line-args'

// local imports

import { 
	PROGRAM_NAME,
	LOG_LEVEL 
} from './consts.js'

import Logger from './logger.js'
import { 
	log as test_log, 
	test_tests,
	test_filesystem,
	test_parallel,
	test_request,
	test_api_youtube_search
} from './tests.js'

import {
	CMD_PREFIX,
	CMDS,
	CLI
} from './consts.js'

import {
	log as api_log
} from './api_client.js'

// constants

const NAME = PROGRAM_NAME
const log = new Logger(NAME)

const cli_args_api = [
	{
		name: 'logging',
		alias: 'l',
		type: String,
		defaultValue: 'info'
	},
	{
		name: 'test',
		alias: 't',
		type: Boolean,
		defaultValue: false
	},
	{
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false
	},
	{
		name: 'tests',
		alias: 'T',
		type: String,
		defaultValue: ''
	}
]

// variables

let do_tests = false
let test_selection = []

// methods

function eavesdrop_commands_help() {
	return `\
eavesdrop commands:\n\
	\n\
	(${CMD_PREFIX}h | ${CMD_PREFIX}help) = show eavesdrop commands\n\
	\n\
	(${CMD_PREFIX}q | ${CMD_PREFIX}quit) = quit eavesdrop\
	`
}

function show_help() {
	log.debug('printing help messages')
	
	console.log('\
cli args:\n\
	\n\
	(-l | --logging) <level>\n\
	\n\
	(-t | --test)\n\
	\n\
	(-T | --tests) <test-selection>\n\
		<test-selection> = comma-separated list of:\n\
		[\n\
			all\n\
			tests\n\
			filesystem\n\
			parallel\n\
			request\n\
			api_youtube_search\n\
		]\n\
		\n\
	(-h | --help)\n\
		\n' + 
	eavesdrop_commands_help() + '\n'
	)
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		show_help()
		finish()
		process.exit()
	}
	else {
		// set logging levels
		log.enable(options.logging)
		test_log.enable(options.logging)
		api_log.enable(options.logging)
		
		log.info('parsing cli args')
		log.debug(options)
	
		log.info('set logging level to ' + options.logging)
		
		//testing
		if (options.test || options.tests != '') {
			do_tests = true
			
			if (options.tests == '' || options.tests == 'all') {
				test_selection = ['all']
			}
			else {
				test_selection = options.tests.split(',')
			}
			
			log.info('testing enabled: ' + test_selection)
		}
	}
}

function tests() {
	return new Promise(function(resolve,reject) {
		let test_promises = [] //array of promises
		let all_tests = test_selection.includes('all')
		
		if (all_tests || test_selection.includes('tests')) {
			//tests module
			log.info('testing tests')
			test_promises.push(test_tests())
		}
		
		if (all_tests || test_selection.includes('filesystem')) {
			//filesystem
			log.info('testing filesystem')
			test_promises.push(test_filesystem())
		}
		
		if (all_tests || test_selection.includes('parallel')) {
			//parallel threads with cluster module
			log.info('testing parallelization')
			test_promises.push(test_parallel())
		}
		
		if (all_tests || test_selection.includes('request')) {
			//request
			log.info('testing http request to pull webpage')
			test_promises.push(test_request())
		}
		
		if (all_tests || test_selection.includes('api_youtube_search')) {
			//api: youtube search
			log.info('testing api client youtube search')
			test_promises.push(test_api_youtube_search())
		}
		
		Promise.all(test_promises)
		.then(function() {
			resolve()
		})
		.catch(function(failures) {
			reject(failures)
		})
	})
}

function get_command(input) {
	/*
	Returns eavesdrop command, or false, or null if invalid command.
	*/
	
	//remove leading and trailing whitespace
	input = input.trim().toLowerCase()
	
	if (input.charAt(0) == CMD_PREFIX) {
		let cmd = input.substring(1)
		
		if (CMDS.includes(cmd)) {
			return cmd
		}
		else {
			log.error(`${cmd} is not a valid command`)
			return null
		}
	}
	else {
		return false
	}
}

function handle_command(input) {
	/*
	Returns true if the input was a command.
	*/
	let cmd = get_command(input)
	
	if (cmd) {
		if (cmd == 'h' || cmd == 'help') {
			console.log(eavesdrop_commands_help())
		}
		else if (cmd == 'q' || cmd == 'quit') {
			finish()
			process.exit()
		}
		
		return true
	}
	else if (cmd === null) {
		return true
	}
	else {
		return false
	}
}

function ask(question) {
	return new Promise(function(resolve) {
		CLI.question(question, function(response) {
			if (!handle_command(response)) {
				resolve(response)
			}
			else {
				resolve(false)
			}
		})
	})
}

function eavesdrop() {
	return new Promise(function(resolve) {
		ask('\ninput a phrase you\'d like to hear.\n')
		.then(function(phrase) {
			if (phrase) {
				log.info('phrase = ' + phrase)
				log.error('phrase look-up not yet implemented')
				
				resolve()
			}
			else {
				eavesdrop()
			}
		})
	})
}

function main() {
	console.log('=== EAVESDROP ===\n')
	
	parse_cli_args()
	
	if (do_tests) {
		tests()
		.then(function() {
			log.info('all tests passed')
			
			eavesdrop()
			.finally(finish)
		})
		.catch(function(failures) {
			log.error(`${failures.length} tests failed`)
			
			try {
				for (failure of failures) {
					log.error(failure)
				}
			}
			catch (e) {
				log.debug(failures)
			}
			finally {
				finish()
			}
		})
	}
	else {
		log.info('running eavesdrop without tests')
		
		eavesdrop()
		.finally(finish)
	}
}

function finish() {
	CLI.close()
	
	console.log('\n=== DONE ===')
}

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop.js')) {
	main()
}

export default main