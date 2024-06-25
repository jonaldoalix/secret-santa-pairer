The project can be run once you modify the example.env file to contain the Twilio account credentials and rename it to just .env.

Start the node app through index.js.  

The project currently has no CSS styling but is fully functional.

The app is intended to function in the following way:

1. A Host collects an even amount of participant data including name and number.
2. They then enter each participant's data into the app.
3. When all participants have been included, the app will take all the data and randomize the entries.
4. Upon conclusion of the randomization, the app will pair participants together.
5. Lastly, each participant is sent via SMS (using the Twilio account you configured in the .env file) their recipient data.

I built this project because my family wanted to do this event but could not get together before the holidays to do the selection process.  This app lets us plug in the participant's info that we had (or could collect remotely), and then without even I knowing, shuffle it all up (like we would in a 'papers in a hat' situation) and give everyone a selection that only they know about right on the spot.

If this helps, enjoy!

PLEASE NOTE: My family has English and Spanish speakers so the message in the SMS body contained in the server function is bilingual.  Feel free to modify that message as needed!
