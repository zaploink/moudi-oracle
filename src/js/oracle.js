const fs = require('fs');

const debug = true;

check (process.argv.length > 2, 'Argument missing: config file must be provided');

const configFilePath = process.argv[2];
fs.readFile(configFilePath, 'utf8', (error, data) => {
	if (error) throw error;
	const config = JSON.parse(data);
	const moudi = determineNextMoudi(config);
	config.history.push(moudi);
	fs.writeFile(configFilePath, JSON.stringify(config), error => {
		if (error) throw error;
		
		const recipient = config.organizers.find(organizer => organizer.username == moudi.organizer);
		log(recipient);
		sendMail(recipient, moudi);
	});
})

function sendMail(recipient, moudi) {
	log(`To: ${recipient.email}\n\nHi ${recipient.name},\nyou have to organize next moudi at tramline ${moudi.tramline}.\nGood luck!`);
}

function determineNextMoudi(config) {
	const organizer = selectOrganizer(config);
	const tramline = selectTramline(config);
	return { organizer : organizer.username, tramline: tramline };
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

function selectTramline(config) {
	check(config.history.length < config.tramlines.length, 'Illegal state: No tramlines left for selection');
	
	const historyTramlines = config.history.map(record => record.tramline);
	const candidateTramlines = config.tramlines.filter(line => !historyTramlines.includes(line));
	return candidateTramlines[Math.floor(Math.random()*candidateTramlines.length)];
}


function log(msg) {
	if (debug) console.log(msg);
}

function check(condition, msg) {
	if (!condition) throw Error(msg);
}