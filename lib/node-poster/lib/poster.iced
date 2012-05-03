
#/**
# * Copyright (c) Nathan Friedly <http://nfriedly.com/>
# *
# * MIT License
# *
# */
 
EventEmitter = require('events').EventEmitter
_ = require('uncerscore')._
fs = require('fs')

class Poster extends EventEmitter
	boundary: "node-poster"
	crlf: "\r\n"
	sections: []

	constructor: (@options, @callback) ->
		EventEmitter.call this
		@options = _.defaults( @options || {}, {
			fields: {}
			files: {}
			headers: {}
		})
		
		# lowercase all headers so that we don't accidentally end up with two
		_.each @options.headers (val, key) ->
			lc = key.toLowerCase()
			if lc != key
				delete @options.headers[key];
				@options.headers[lc] = val
		
		_.defaults @options.headers {
			"content-type": "multipart/form-data, boundary=#{@boundary}"
		}
		
		_.each @options.fields, (data, name) ->
			@sections.push( new Field( name, data, @boundary, @crlf ) )
		
		_.each @options.files, (path, name) -> 
			@sections.push( new File(  name, data, @boundary, @crlf ) )
		
	getFieldsLength: (cb) -> 
		errors = false
		await
			@sections.forEach (section) -> 
				section.getContentLength defer err, len
		adder = (prev, section) -> 
			if section.err
				errors = true
				cb section.err
			prev + section.contentLength
		cb @sections.reduce adder, 0 unless errors


class Field
	constructor: (@name, @data, @boundary, @crlf) ->
	
	writeData: (stream, cb) ->
		stream.write(@data)
		cb(null)
		
	getHead: -> [
			@boundary
			'content-disposition: form-data; name="#{@name}"'
			@crlf
		].join @crlf
		
	getDataLength: (cb) -> cb(null, Buffer.byteLength(@data))
		
	getContentLength: (cb) -> 
		@getDataLength (err, body) -> 
			@err = err
			return cb(err) if err
			@contentLength = Buffer.byteLength(@getHead() + @crlf + @crlf) + body
			cb @contentLength

class File extends Field
	writeData: (stream, cb) ->
		rs = fs.createReadStream(@data)
		rs.pipe(stream, {end: false})
		rs.on 'end', -> cb(null)
		rs.on 'error', (err) -> cb(err)
		
	getDataLength: (cb) -> 
		fs.stat @data, (err,stats) -> 
			cb(err, stats && stats.size)
