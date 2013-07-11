.PHONY: all test

UGLIFY=node_modules/.bin/uglifyjs

all: webclient

clean:
	rm -rf webclient

test:
	node_modules/.bin/mocha

webclient/%.uncompressed.js: before.js lib/%.js after.js
	mkdir -p webclient
	cat $^ > $@

webclient/json0.uncompressed.js: before.js lib/helpers.js lib/text0.js lib/json0.js after.js
	mkdir -p webclient
	cat $^ > $@

webclient/text0.uncompressed.js: before.js lib/helpers.js lib/text0.js after.js
	mkdir -p webclient
	cat $^ > $@

# Uglify.
webclient/%.js: webclient/%.uncompressed.js
	$(UGLIFY) $< --lint -c unsafe=true -mo $@

# Compile the types for a browser.
webclient: webclient/json0.js webclient/text0.js webclient/text.js webclient/text-tp2.js
#webclient/json.js won't work yet - it needs the helpers and stuff compiled in as well.
