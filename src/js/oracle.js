const fs = require('fs');

const debug = true;

check (process.argv.length > 2, 'Argument missing: config file must be provided');

const configFilePath = process.argv[2];
fs.readFile(configFilePath, 'utf8', (error, data) => {
	if (error) throw error;
	const config = JSON.parse(data);
	
	// check if run this month already unless --force
	const currentMonth = getCurrentMonth();
	const force = (process.argv.length > 3 && process.argv[3] == "--force");
	const lastMoudi = getLastMoudi(config);
	if (lastMoudi && lastMoudi.month >= currentMonth && !force) {
		log("Moudi oracle was already run this month. Not doing anything.");
		return;
	}
	
	const moudi = determineNextMoudi(config);
	config.history.push(moudi);
	fs.writeFile(configFilePath, JSON.stringify(config), error => {
		if (error) throw error;
		
		const recipient = config.organizers.find(organizer => organizer.username == moudi.organizer);
		log(recipient);
		sendMail(recipient, moudi);
	});
})

function getCurrentMonth() {
	return getMonth(new Date());
}

function getMonth(date) {
	return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}`;
}

function getLastMoudi(config) {
	return config.history.length == 0 ? null : config.history[config.history.length-1];
}

function sendMail(recipient, moudi) {
	log(`To: ${recipient.email}\n\nHi ${recipient.name},\nyou have to organize next moudi (${moudi.month}) at tramline ${moudi.tramline}.\nGood luck!`);
}

function determineNextMoudi(config) {
	const organizer = selectOrganizer(config);
	const tramline = selectTramline(config);
	
	const lastMoudi = getLastMoudi(config);
	const nextMonth = lastMoudi ? incrementMonth(lastMoudi.month) : getCurrentMonth();
	
	return { month : nextMonth, organizer : organizer.username, tramline: tramline };
}

function incrementMonth(month) {
	const date = new Date(Date.parse(month));
	const nextMonth = date.getMonth() + 1 % 12;
	date.setMonth(nextMonth);
	if (nextMonth == 0) {
		date.setYear(date.getYear() + 1);
	}
	return getMonth(date);
}

function selectOrganizer(config) {	
	if (config.history.length == 0) {
		// on first run choose random organizer
		const i = Math.floor(Math.random() * config.organizers.length);
		return config.organizers[i];
	}
	
	const lastUsername = getLastMoudi(config).organizer;
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