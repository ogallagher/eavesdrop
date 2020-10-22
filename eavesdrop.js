/*

Owen Gallagher
2020-10-13

*/

// external imports

import fs from 'fs'
import debug from 'debug'
import cli_args from 'command-line-args'
import readline from 'readline'

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
	test_request
} from './tests.js'

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

function show_help() {
	log.debug('printing help message')
	
	console.log('\
(-l | --logging) <level>\n\
(-t | --test)\n\
(-T | --tests) <test-selection>\n\
	<test-selection> = comma-separated list of:\n\
	[\n\
		all\n\
		tests\n\
		filesystem\n\
		parallel\n\
		request\n\
	]\n\
(-h | --help)\n'
	)
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		show_help()
		process.exit()
	}
	else {
		// set logging levels
		log.enable(options.logging)
		test_log.enable(options.logging)
		
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
		
		Promise.all(test_promises)
		.then(function() {
			resolve()
		})
		.catch(function(failures) {
			reject(failures)
		})
	})
}

function finish() {
	console.log('\n=== DONE ===')
}

function eavesdrop() {
	const cl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout
	})
	
	return new Promise(function(resolve,reject) {
		cl.question('\ninput a phrase you\'d like to hear.\n', function(phrase) {
			log.info('phrase = ' + phrase)
			log.error('phrase look-up not yet implemented')
			
			cl.close()
			resolve()
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

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop.js')) {
	main()
}

export default main