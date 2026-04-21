const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Taki PHP aaram se server se baat kar sake

// 🔥 REAL-TIME SOCKET SERVER BANANA 🔥
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Socket connection check
io.on('connection', (socket) => {
    console.log('🌐 Ek browser (PHP page) Live connect ho gaya hai!');
});

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth(), // 🔥 Yeh add kiya taaki baar-baar QR scan na karna pade
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', (qr) => {
    // Generate the QR code in terminal
    // { small: true } likhna bahut zaroori hai cloud server ke liye taaki QR normal size ka aaye!
    qrcode.generate(qr, { small: true }); 
});

client.on('ready', () => { console.log('✅ WhatsApp System Ready!'); });
client.on('authenticated', () => { console.log('🔓 WhatsApp Authentication successful!'); });

// PHP se Manual Message lene ki purani API
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Data missing' });

    let cleanPhone = phone.toString().replace(/\D/g, '');
    const chatId = (cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone) + '@c.us'; 

    try {
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) return res.status(400).json({ error: 'Not on WhatsApp' });

        await client.sendMessage(chatId, message);
        console.log(`✉️ Message sent to ${cleanPhone}`);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔥 MACRODROID (MOBILE) KE LIYE SMART SMS API 🔥
app.post('/api/payment-hook', (req, res) => {
    const { sender, raw_sms } = req.body;
    
    console.log(`\n📩 Naya SMS Aaya (${sender}): ${raw_sms}`);

    // SMS se Amount nikalne ka Jadoo (Regex)
    let amount = 0;
    // Yeh code SMS mein "Rs", "Rs.", ya "INR" ke aage likha number dhundhega
    const match = raw_sms.match(/(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]+)?)/i);
    
    if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        console.log(`💰 BINGO! Amount Extracted: ₹${amount}`);
        
        // Browser (PHP) ko turant Live signal bhejo
        io.emit('payment_success_live', { amount: amount, message: 'Payment Received' });
    } else {
        console.log('⚠️ Is SMS mein koi payment amount nahi mila.');
    }

    res.status(200).json({ success: true });
});

// "Cannot GET /" wala error hatane ke liye
app.get('/', (req, res) => {
    res.send('✅ Aimers Academy WhatsApp Bot is Live and Running 24/7!');
});

client.initialize();

// 🔥 BUG FIX: Dhyan dein: Ab app.listen nahi, server.listen chalega 🔥
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
