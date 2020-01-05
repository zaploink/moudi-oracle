const fs = require('fs');
const nodemailer = require('nodemailer');

const debug = true;
const sendmail = true;

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

		log(`[${new Date().toLocaleString("de-CH")}] Moudi oracle has been invoked successfully: ${moudi.month} will be organized by ${moudi.organizer} on tramline #${moudi.tramline}`);
		
		fs.writeFile(configFilePath, JSON.stringify(config), error => {
			if (error) throw error;
		
			if (sendmail) {
				const recipient = config.organizers.find(user => user.username == moudi.organizer);
				const cc = config.organizers.filter(user => user.username != moudi.organizer).map(user => user.email); 
				sendMail(recipient, cc, moudi, config.mailconfig);
			}
		});
	} 
	else {
		log("Moudi oracle has already run this month. Not doing anything.");
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

function sendMail(recipient, cc, moudi, mailconfig) {
	const transport = nodemailer.createTransport({
		host: mailconfig.host,
		port: mailconfig.port,
		secure: mailconfig.secure,
		auth: {
			user: mailconfig.user,
			pass: mailconfig.pass
		}
	});
	
	transport.sendMail({
		from: mailconfig.from,
		to: recipient.email,
		cc: cc,
		subject: `[Moudi-Oracle] Next Moudi: ${moudi.month}`,
		text: `Hi ${recipient.name},\n\nYou have been chosen to organize the next Moudi (${moudi.month}) at tramline ${moudi.tramline}.\nGood luck!\n\nYours truly,\nMoudi Oracle`
	}, (error) => {
		if (error) throw error;
		log(`Mail successfully sent to ${recipient.email} with CC to ${cc}`);
	});
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