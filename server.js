const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(bodyParser.json());
app.use(cors()); 

// 🔥 REAL-TIME SOCKET SERVER BANANA 🔥
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let latestQR = ""; // Naya variable QR code save karne ke liye
let isConnected = false; 

// Socket connection check
io.on('connection', (socket) => {
    console.log('🌐 Ek browser (PHP page) Live connect ho gaya hai!');
});

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth(), 
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', (qr) => {
    latestQR = qr; // QR code ko variable me save kar liya
    qrcode.generate(qr, { small: true }); 
    console.log('✅ Naya QR Code ban gaya hai! Ise scan karne ke liye https://aimers-wa-bo.onrender.com/ par jayein');
});

client.on('ready', () => { 
    isConnected = true;
    latestQR = ""; 
    console.log('✅ WhatsApp System Ready!'); 
});

client.on('authenticated', () => { 
    console.log('🔓 WhatsApp Authentication successful!'); 
});

// 🔥 JADUI FEATURE: QR Code ko Website Par Dikhana 🔥
app.get('/', (req, res) => {
    if (isConnected) {
        res.send('<h1 style="color:green; text-align:center; margin-top:100px; font-family:sans-serif;">✅ WhatsApp Bot is Live and Connected! 24/7</h1>');
    } else if (latestQR) {
        // Agar connect nahi hai, toh seedha saaf suthra Image wala QR code dikhao
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2 style="color:#003366;">📱 Apne Phone ke WhatsApp se ise Scan Karein</h2>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQR)}" alt="WhatsApp QR" style="border: 4px solid #FFCC00; padding: 15px; border-radius: 15px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);"/>
                <p style="color:#666; margin-top:20px;">*Agar scan na ho toh is page ko refresh kar lein.*</p>
            </div>
        `);
    } else {
        res.send('<h2 style="text-align:center; margin-top:100px; font-family:sans-serif;">⏳ Starting WhatsApp Bot... Please refresh in 10-15 seconds.</h2>');
    }
});

// PHP se Manual Message lene ki API
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

// 🔥 MACRODROID (MOBILE) API 🔥
app.post('/api/payment-hook', (req, res) => {
    const { sender, raw_sms } = req.body;
    let amount = 0;
    const match = raw_sms.match(/(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]+)?)/i);
    
    if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        io.emit('payment_success_live', { amount: amount, message: 'Payment Received' });
    }
    res.status(200).json({ success: true });
});

client.initialize();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
