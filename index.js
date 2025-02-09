const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://ag8244932:7iS30iZhmQ5Ttsxf@cluster0.vpkss.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const contactSchema = new mongoose.Schema({
  phoneNumber: String,
  email: String,
  linkedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  linkPrecedence: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

const Contact = mongoose.model('Contact', contactSchema);

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;

  try {
    // Find existing contacts
    const existingContacts = await Contact.find({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (existingContacts.length === 0) {
      const newContact = new Contact({ email, phoneNumber });
      await newContact.save();

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact._id,
          emails: [newContact.email],
          phoneNumbers: [newContact.phoneNumber],
          secondaryContactIds: [],
        },
      });
    }

    // Identify primary contact
    let primaryContact = existingContacts.find(contact => contact.linkPrecedence === 'primary');
    if (!primaryContact) {
      primaryContact = existingContacts[0];
    }

    // Collect emails and phone numbers
    const emails = new Set();
    const phoneNumbers = new Set();
    const secondaryContactIds = [];

    existingContacts.forEach(contact => {
      emails.add(contact.email);
      phoneNumbers.add(contact.phoneNumber);
      if (contact._id.toString() !== primaryContact._id.toString()) {
        secondaryContactIds.push(contact._id);
      }
    });
    const isNewInfo = !emails.has(email) || !phoneNumbers.has(phoneNumber);
    if (isNewInfo) {
      const newSecondaryContact = new Contact({
        email,
        phoneNumber,
        linkedId: primaryContact._id,
        linkPrecedence: 'secondary',
      });
      await newSecondaryContact.save();

      secondaryContactIds.push(newSecondaryContact._id);
      emails.add(email);
      phoneNumbers.add(phoneNumber);
    }

    res.status(200).json({
      contact: {
        primaryContatctId: primaryContact._id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});