/*

Owen Gallagher
2020-10-13

*/

// external imports

import debug from 'debug'

// local imports

import { LOG_LEVEL } from './consts.js'

// constants

const NAME = 'eavesdrop:logger'

// types

export function Logger(name) {
	this.name = name
	this.level = LOG_LEVEL['off']
	
	this.root = debug(name)
	
	this.critical = this.root.extend('critical')
	this.error = this.root.extend('error'),
	this.warning = this.root.extend('warning'),
	this.info = this.root.extend('info'),
	this.debug = this.root.extend('debug')
	
	this.root = undefined
}

Logger.prototype.extend = function(name) {
	return new Logger(this.name + ':' + name)
}

Logger.prototype.enable = function(level_str) {
	let log_level = LOG_LEVEL[level_str]
	this.level = log_level
	
	this.critical.enabled = true
	if (log_level >= LOG_LEVEL['error']) {
		this.error.enabled = true
		
		if (log_level >= LOG_LEVEL['warning']) {
			this.warning.enabled = true
			
			if (log_level >= LOG_LEVEL['info']) {
				this.info.enabled = true
				
				if (log_level >= LOG_LEVEL['debug']) {
					this.debug.enabled = true
				}
			}
		}
	}
}

export default Logger