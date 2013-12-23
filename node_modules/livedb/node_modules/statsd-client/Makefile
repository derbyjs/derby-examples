PATH:=./node_modules/.bin:${PATH}

.PHONY: all test lint

all: lint test

test:
	mocha -R spec

lint:
	jshint lib/ test/
