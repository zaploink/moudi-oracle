const fs = require('fs');

const debug = true;

check (process.argv.length > 2, 'Argument missing: config file must be provided');

const configFilePath = process.argv[2];
fs.readFile(configFilePath, 'utf8', (error, data) => {
	if (error) throw error;
	const config = JSON.parse(data);
	
	// check if run this month already unless --force
	const force = (process.argv.length > 3 && process.argv[3] == "--force");
	if (shouldRun(config.history) || force) {
		const moudi = determineNextMoudi(config.organizers, config.tramlines, config.history);
		config.history.push(moudi);
		
		fs.writeFile(configFilePath, JSON.stringify(config), error => {
			if (error) throw error;
			
			const recipient = config.organizers.find(organizer => organizer.username == moudi.organizer);
			sendMail(recipient, moudi);
		});
	} 
	else {
		log("Moudi oracle was already run this month. Not doing anything.");
	}
	
})

function shouldRun(history) {
	const currentMonth = getCurrentMonth();
	const lastMoudi = getLastMoudi(history);
	return lastMoudi == null || lastMoudi.month < currentMonth;
}

function getCurrentMonth() {
	return getMonth(new Date());
}

function getMonth(date) {
	return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}`;
}

function getLastMoudi(history) {
	return history.length == 0 ? null : history[history.length-1];
}

function sendMail(recipient, moudi) {
	log(`To: ${recipient.email}\n\nHi ${recipient.name},\nyou have to organize next moudi (${moudi.month}) at tramline ${moudi.tramline}.\nGood luck!`);
}

function determineNextMoudi(organizers, tramlines, history) {
	const lastMoudi = getLastMoudi(history);
	const nextMonth = calculateNextMonth(lastMoudi);
	const nextOrganizer = selectOrganizer(lastMoudi, organizers);
	const nextTramline = selectTramline(tramlines, history);	
	
	return { month : nextMonth, organizer : nextOrganizer.username, tramline: nextTramline };
}

function calculateNextMonth(moudi) {
	return moudi ? incrementMonth(moudi.month) : getCurrentMonth();
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

function selectOrganizer(lastMoudi, organizers) {	
	if (!lastMoudi) {
		// on first run choose random organizer
		const i = Math.floor(Math.random() * organizers.length);
		return organizers[i];
	}
	
	const lastUsername = lastMoudi.organizer;
	const i = organizers
		.map(organizer => organizer.username)
		.indexOf(lastUsername);
	return organizers[(i + 1) % organizers.length];
}

function selectTramline(tramlines, history) {
	check(history.length < tramlines.length, 'Illegal state: No tramlines left for selection');
	
	const historyTramlines = history.map(record => record.tramline);
	const candidateTramlines = tramlines.filter(line => !historyTramlines.includes(line));
	return candidateTramlines[Math.floor(Math.random()*candidateTramlines.length)];
}


function log(msg) {
	if (debug) console.log(msg);
}

function check(condition, msg) {
	if (!condition) throw Error(msg);
}