/*

Owen Gallagher
2020-10-24

*/

// external imports

import {
	Transform
} from 'stream'

// local imports

import {
	PROGRAM_NAME,
	TTXT_REGEX_COMPLETE
} from './consts.js'

import Logger from './logger.js'

// constants

const NAME = PROGRAM_NAME + ':reader'
export const log = new Logger(NAME)

// methods

// classes

export function CaptionsReader() {
	//tbd
}

export class TimedTextCleaner extends Transform {
	constructor() {
		super({
			readableObjectMode: true,
			writableObjectMode: true
		})
		
		this.partial = ''
	}
	
	_transform(chunk, encoding, next) {
		// convert buffer to string
		let str = chunk.toString(encoding)
		
		// TODO clean timedtext
		let completes = str.match(TTXT_REGEX_COMPLETE)
		
		let partial_start = str.substr(0,str.indexOf(completes[0]))
		
		let last_complete = completes[completes.length-1]
		let partial_end = str.substring(str.indexOf(last_complete) + last_complete.length)
		
		return next(null,chunk)
	}
}
