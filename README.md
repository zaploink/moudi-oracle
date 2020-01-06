# Tasks

## Organizer + Location selector
in: state
out: updated state
- select organizer (on init/first run) from organizer list, compare with last history
- select tramline (from tramline list), filtered by history
- if not init select alternate organizer and set as "last organizer"
- store lists/state
- send mail to organizer with tramline

## Restaurant selector (simple)
in: tramline
out: restaurant list
config: search diameter
- select all tramstations of line t
- select all restaurants in proximity of stop(t)
- send mail with restaurant list (names)

## Apply Moudi rules
in: restaurant list (including address, geolocation, e.g. grouped by tramstop), tramline
out: filtered restaurants that face tramline (are on same street)
- find street segments of tram
- select restaurants that have address that has its address on street segment

## Restaurant suggestion
- check tripadvisor
- select best restaurants
- order by whatever criteria

## Render restaurant list
- make look nice

# Run

- Install node.js
- Run `npm install` in this directory
- Run `node src/js/oracle.js <configfile.json> [--force]` to run the moudi-oracle

The provided configuration file must be in the format documented below, you can find
an example file with empty history (fill in proper organizers and mailer passwords)
in the `config` folder.

Note that the script can only be run once per month. It will exit, if it detects,
that it has already been run for the current mont. You can use `--force` as 2nd 
argument to force finding of next month's moudi.

## Run as Cron Job

Note that cron sends a mail if there's a problem during execution. This is no
good on systems that have no mail infrastructure set up.

It's better to log the cron output by redirecting `sterr` to `stout` and using
the standard unix logging facilities, as described in [this post](https://unix.stackexchange.com/a/330):

`0 0 1 * * node oracle.js config.json 2>&1 | /usr/bin/logger -t moudi-oracle`

Output will be in `/var/log/messages` (can be filtered by tag `moudi-oracle`)

If node has been installed with `nvm` then it will be not be available systemwide.
NVM has to be set up correctly before running and then `$(which node) ...` should be
used to select the default node version as provided by NVM. All of this setup code
including the invocation of oracle.js is best put into a `run-moudi.sh` script which
can then be executed with _cron_:

```
#!/bin/bash

# NVM needs the ability to modify your current shell session's env vars,
# which is why it's a sourced function.
# See https://gist.github.com/simov/cdbebe2d65644279db1323042fcf7624

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

# uncomment the line below if you need a specific version of node
# other than the one specified as `default` alias in NVM (optional)
# nvm use 4 1> /dev/null

# run moudi with the node version selected by NVM
MOUDI_HOME=$HOME/moudi
$(which node) $MOUDI_HOME/oracle/src/js/oracle.js $MOUDI_HOME/config.json 2>&1
```

# Configuration file format

```
{
	"mailconfig": {
		"host": "mail.yourhost.ch",
		"port": 465,
		"secure": true,
		"user": "***",
		"pass": "***",
		"from": "Moudi Oracle <***>"
	},
	"organizers" : [
		{ 
			"username" : "ff",
			"name"  : "Fred",
			"email" : "fred@feuerstein.ch"
		}, 
		{
			"username"    : "jd",
			"name"  : "John",
			"email" : "john@doe.com"
		}
	],
	"tramlines": [ 2, 3, 4,  5, 6, 7,  8, 9, 10,  11, 13, 14 ],
	"history" : [
		{
			"month" : "2020-01",
			"organizer" : "ff",
			"tramline" : 4
		}
	]
}
```


