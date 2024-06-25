require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3024;

app.set('view engine', 'ejs');
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

var participants = [];

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

app.post('/addParticipant', (req, res) => {
    const { name, phoneNumber } = req.body;
    participants.push({ name, phoneNumber });
    res.json({ success: true });
});

app.get('/makeAssignments', async (req, res) => {
    try {
        let assignments = assignSecretSantas(participants)
        await sendTextMessages(assignments);
        res.json(assignments)
    } catch (error) {
        console.error('Error making assignments:', error.message);
        res.status(500).json({ error: 'Error making assignments.'})
    }
});

app.get('/', (req, res) => {
    res.render('index', { port: PORT });
});

app.listen(PORT, () =>{
    console.log(`Server is running on port ${PORT}`);
});

function assignSecretSantas(participants) {
    const santas = [...participants];
    const recipients = [...participants];

    recipients.sort(() => Math.random() - 0.5);

    let validAssignments = false;

    while (!validAssignments) {
        validAssignments = true;

        for (let i = 0; i < santas.length; i++) {
            // Check for reciprocal assignment and self-assignment
            if (santas[i] === recipients[i] || recipients.indexOf(santas[i]) === i) {
                validAssignments = false;
                recipients.sort(() => Math.random() - 0.5);
                break;
            }
        }
    }

    const assignments = santas.map((santa, index) => ({
        santa: santa,
        recipient: recipients[index]
    }));

    return assignments;
}

async function sendTextMessages(assignments) {
    for (const assignment of assignments) {
        const santaPhoneNumber = assignment.santa.phoneNumber;
        const recipientName = assignment.recipient.name;

        try {
            await client.messages.create({
                body: `Hello ${assignment.santa.name}! Your Secret Santa recipient is: ${recipientName}. DO NOT SHARE THIS WITH ANYONE. The budget is $25.  See you the 24th!\r\n\r\n¡Hola ${assignment.santa.name}! Su asignación para Secret Santa es ${recipientName}. MANTENGALO UN SECRETO. Por favor no excedas el presupuesto de $25. ¡Nos vemos el 24!`,
                from: twilioPhoneNumber,
                to: santaPhoneNumber,
            });

            console.log(`Text message sent to ${assignment.santa.name}`);
        } catch (error) {
            console.error(`Error sending text message to ${assignment.santa.name}:`, error.message);
        }
    }
}