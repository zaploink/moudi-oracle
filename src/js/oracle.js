const fs = require('fs');

const debug = true;

check (process.argv.length > 2, 'Argument missing: config file must be provided');

const configFilePath = process.argv[2];
fs.readFile(configFilePath, 'utf8', (error, data) => {
	if (error) throw error;
	const config = JSON.parse(data);
	
	// check if run this month already unless --force
	const now = new Date();
	const runMonth = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;
	
	const force = (process.argv.length > 3 && process.argv[3] == "--force");
	const lastMoudi = config.history.length == 0 ? null : config.history[config.history.length-1];
	if (lastMoudi && lastMoudi.month == runMonth && !force) {
		log("Moudi oracle was already run this month. Not doing anything.");
		return;
	}
	
	const moudi = determineNextMoudi(runMonth, config);
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

function determineNextMoudi(runMonth, config) {
	const organizer = selectOrganizer(config);
	const tramline = selectTramline(config);
	return { month : runMonth, organizer : organizer.username, tramline: tramline };
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