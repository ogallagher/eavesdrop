/*

Owen Gallagher
20 Oct 2020

*/

// external imports

import debug from 'debug'
import cli_args from 'command-line-args'

// local imports

import Logger from './logger.js'

// constants

const NAME = 'eavesdrop:eavesdrop_child'
const log = new Logger(NAME)
const is_child = (typeof process.send == 'function')

const cli_args_api = [
	{
		name: 'logging',
		alias: 'l',
		type: String,
		defaultValue: 'info'
	},
	{
		name: 'do',
		alias: 'd',
		type: String,
		defaultValue: 'help'
	},
	{
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false
	}
]

// variables

let tasks = []

// methods

function show_help() {
	console.log('\
This is a module containing methods that can be invoked by an eavesdrop \
parent process.\n\n\
	(-h | --help)\n\
	(-l | --logging) <level>=\'info\'\n\
	(-d | --do) <task-selection>=\'help\'\n')
}

function parse_cli_args() {
	let options = cli_args(cli_args_api)
	
	if (options.help) {
		show_help()
	}
	else {
		// set logging levels
		log.enable(options.logging)
		
		log.debug('parsing cli args')
		log.debug(options)
		
		log.debug('set logging level to ' + options.logging)
		
		//tasks
		if (options.do == '' || options.do == 'all') {
			tasks = ['all']
		}
		else {
			tasks = options.do.split(',')
		}
		
		log.info('will do tasks: ' + tasks)
	}
}

function test_parallel() {
	let pid = process.pid
	log.debug(`eavesdrop child process = ${pid}`)
	
	log.debug('performing simple task')
	let str = ''
	let j=0
	for (let i=0; i<1000; i++) {
		if (i % 10 == 0) {
			str += '..........' + i
		}
		else {
			let temp = str.split('')
			temp[j++] = '?'
			str = temp.join('')
		}
	}
	
	if (is_child) {
		process.send(str)
		log.debug(`eavesdrop child ${pid} complete`)
	}
	else {
		log.warning('child has no parent process')
	}
}

function main() {
	parse_cli_args()
	
	for (let task of tasks) {
		log.info('performing ' + task)
		
		if (task == 'help') {
			show_help()
		}
		else if (task == 'test_parallel') {
			test_parallel()
		}
	}
}

// main / exports

if (process.argv.length > 1 && process.argv[1].endsWith('eavesdrop_child.js')) {
	main()
}

export default main