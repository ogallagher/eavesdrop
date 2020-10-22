/*

Owen Gallagher
2020-10-22

*/

// external imports

// translation module
import {
	I18n
} from 'i18n'

import os_locale from 'os-locale'

import fs from 'fs'

// internal imports

import {
	PROGRAM_NAME,
	CMD_PREFIX,
	CMDS,
	CLI,
	LOCALE_DIR
} from './consts.js'

import Logger from './logger.js'

import {
	do_command
} from './util.js'

// constants

const NAME = PROGRAM_NAME + ':io'
export const log = new Logger(NAME)

const i18n = new I18n()

// variables

let do_translate = false

// methods

export function get_command(input) {
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

export function handle_command(input) {
	/*
	Returns true if the input was a command or attempted command.
	*/
	let cmd = get_command(input)
	
	if (cmd) {
		do_command(cmd)
		
		return true
	}
	else if (cmd === null) {
		return true
	}
	else {
		return false
	}
}

export function ask(question, commandable=true) {
	return new Promise(function(resolve) {
		if (do_translate) {
			question = i18n.__(question)
		}
		
		CLI.question(question, function(response) {
			if (!commandable || !handle_command(response)) {
				resolve(response)
			}
			else {
				resolve(false)
			}
		})
	})
}

export function init_translation(locale) {
	return new Promise(function(resolve, reject) {
		//make sure locales directory exists
		fs.mkdir(LOCALE_DIR, function(err) {
			let go = true
			
			if (err) {
				if (err.code == 'EEXIST') {
					log.debug(`${LOCALE_DIR} exists for translation`)
				}
				else {
					go = false
					log.error(`failed to create ${LOCALE_DIR} for translation`)
					reject('io.locale.dir')
				}
			}
			else {
				log.info(`created ${LOCALE_DIR} for translation`)
			}
			
			if (go) {
				//configure i18n
				if (locale == undefined) {
					os_locale()
					.then(function(osl) {
						init_translation(osl)
						.then(resolve)
					})
					.catch(function(err) {
						log.error(error)
						reject('io.locale.os')
					})
				}
				else {
					log.debug(`supported languages: ${i18n.getLocales()}`)
					log.info('default language = ' + locale)
					
					i18n.configure({
						locales: ['en', 'es'],
						fallbacks: {
							nl: 'en',
							'en-*': 'en',
							'es-*': 'es'
						},
						defaultLocale: locale,
						directory: LOCALE_DIR,
					})
					
					do_translate = true
					
					resolve()
				}
			}
		})
	})
}