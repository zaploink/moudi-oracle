const fs = require('fs');

const debug = true;

check (process.argv.length > 2, 'Argument missing: config file must be provided');

const configFilePath = process.argv[2];
fs.readFile(configFilePath, 'utf8', (error, data) => {
	if (error) throw error;
	organizeNextMoudi(JSON.parse(data));
})

function organizeNextMoudi(config) {
	const organizer = selectOrganizer(config);
	log(organizer);
	// select tram
	// write history
	// send email
}

function selectOrganizer(config) {	
	if (config.history.length == 0) {
		// on first run choose random organizer
		const i = Math.floor(Math.random() * config.organizers.length);
		return config.organizers[i];
	}
	
	const lastUsername = config.history[config.history.length-1].organizer;
	const i = config.organizers
		.map(organizer => organizer.username)
		.indexOf(lastUsername);
	return config.organizers[(i + 1) % config.organizers.length];
}

function log(msg) {
	if (debug) console.log(msg);
}

function check(condition, msg) {
	if (!condition) throw Error(msg);
}