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

import {
	init_loggers,
	init_config,
	finish as util_finish,
	eavesdrop_commands_help
} from './util.js'

import Logger from './logger.js'

import {
	ask,
	init_translation
} from './io.js'

import { 
	test_tests,
	test_filesystem,
	test_parallel,
	test_request,
	test_translation,
	test_api_youtube_search,
	test_results_show,
	test_results
} from './tests.js'

import {
	CMD_PREFIX
} from './consts.js'

import {
	init as init_api_client,
	config as config_api_client
} from './api_client.js'

// constants

const NAME = PROGRAM_NAME
export const log = new Logger(NAME)

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
	},
	{
		name: 'language',
		alias: 'L',
		type: String,
		defaultValue: ''
	}
]

// variables

let do_tests = false
let test_selection = []
let locale = undefined

// methods

function eavesdrop_help() {
	log.debug('showing help messages')
	
	return `
cli args:
	(-l | --logging) <level>

	(-L | --language) <locale>
		<locale> = locale name (language-region combination; ex. en-US)
	
	(-t | --test)

	(-T | --tests) <test-selection>
		<test-selection> = comma-separated list of:
		[
			all
			tests
			filesystem
			parallel
			request
			translation
			api-youtube-search
			test-results-show
			test-results
		]

	(-h | --help)
	
${eavesdrop_commands_help()}
`
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		console.log(eavesdrop_help())
		finish()
		process.exit()
	}
	else {
		// set logging levels
		init_loggers(options.logging)
		
		log.info('parsing cli args')
		log.debug(options)
	
		log.info('set logging level to ' + options.logging)
		
		// set locale
		if (options.language != '') {
			locale = options.language
		}
		
		// testing
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

function config() {
	// init from config file
	init_config()
	.then(function(config) {
		config_api_client(config)
	})
	.catch(function() {
		log.warning('no configuration file found')
	})
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
		
		if (all_tests || test_selection.includes('translation')) {
			//translation
			log.info('testing translation')
			test_promises.push(test_translation())
		}
		
		if (all_tests || test_selection.includes('api-youtube-search')) {
			//api: youtube search
			log.info('testing api client youtube search')
			test_promises.push(test_api_youtube_search())
		}
		
		if (all_tests || test_selection.includes('test-results-show')) {
			//results: show
			log.info('testing results preview')
			test_promises.push(test_results_show())
		}
		
		if (all_tests || test_selection.includes('test-results')) {
			//results: show
			log.info('testing results clear, update, write, and show')
			test_promises.push(test_results())
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
				.then(resolve)
			}
		})
	})
}

function main() {
	console.log('=== EAVESDROP ===\n')
	
	parse_cli_args()
	
	config()
	
	init_translation(locale)
	.then(function() {
		log.debug('initialized translation module')
	})
	.catch(function(e) {
		log.error('failed to initialize translation module')
	})
	.finally(function() {
		init_api_client()
		.then(function() {
			log.debug('initialized api_client module')
		})
		.catch(function(e) {
			log.error('failed to initialize api_client module')
			log.error(e)
		})
		.finally(function() {
			if (do_tests) {
				tests()
				.then(function() {
					log.info('all tests passed')
			
					eavesdrop()
					.finally(finish)
				})
				.catch(function(failures) {
					if (failures.length instanceof Array) {
						log.error(`${failures.length} tests failed: ${failures}`)
					}
					else {
						log.error(`one test failed: ${failures}`)
					}
				
					finish()
				})
			}
			else {
				log.info('running eavesdrop without tests')
		
				eavesdrop()
				.finally(finish)
			}
		})
	})
}

function finish() {
	util_finish()
	console.log('\n=== DONE ===')
}

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop.js')) {
	main()
}

export default main