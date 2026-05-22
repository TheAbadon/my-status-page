// ===== server.js =====
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data', 'status.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

const tokens = new Set();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

const defaultData = {
    name: 'Nguyễn Đức Bảo',
    role: 'Lập trình viên mới nhú',
    status: 'free',
    autoStatus: false,
    busyStart: 7,
    busyEnd: 17,
    autoBusyStatus: 'busy',
    autoFreeStatus: 'free',
    typewriterEnabled: true,
    typewriterSpeed: 80,
    language: 'vi',
    diary: '',
    progressStartDate: '2025-06-11',
    clickSoundEnabled: true,
    fields: [
        { key: 'birthday', label: 'Ngày sinh', value: '2008-06-13' },
        { key: 'email', label: 'Email', value: 'baoscb11@gmail.com' },
        { key: 'phone', label: 'Số điện thoại', value: '0364 355 610' },
        { key: 'location', label: 'Địa điểm', value: 'Quảng Ngãi' },
        { key: 'avatar', label: 'Ảnh đại diện', value: 'https://scontent.fsgn2-10.fna.fbcdn.net/v/t39.30808-6/484850184_678932217922441_3977152377095809161_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeGwAW5M1QgT7BrUd2IBDnHBoRyRV5vSC6-hHJFXm9ILr8zCb61_C1dIE0zWZIQFErK-suhwf3op_pX9ARFl_yMt&_nc_ohc=_Zl8OreUIGsQ7kNvwEtSxyO&_nc_oc=Ado516Qp7zqrw03DXDIzeS9HFKrs4x46vSPfFRuZ9N9f94S0Ba3HXgRXNOic-IrKSE13iOEp53XtVnlBiAN9I-lN&_nc_zt=23&_nc_ht=scontent.fsgn2-10.fna&_nc_gid=yhl1TOSMkWe9qX067Q0PGQ&_nc_ss=7b2a8&oh=00_Af6Bgplcg5fJJZkBAH-veHLaTrlFQlC0d8wNndsfs6BWcw&oe=6A163C0A' },
        { key: 'github', label: 'GitHub', value: 'https://github.com/TheAbadon' },
        { key: 'facebook', label: 'Facebook', value: 'https://www.facebook.com/nguyen.uc.bao.48593' },
        { key: 'countdownEvent', label: 'Tên sự kiện đếm ngược', value: 'Thi THPT quốc gia' },
        { key: 'countdownDate', label: 'Thời điểm sự kiện', value: '2026-06-11 07:00:00' },
        { key: 'discord_id', label: 'Discord ID', value: '879247511745875999' },
    ],
    updatedAt: new Date().toISOString()
};

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return { ...defaultData };
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return { ...defaultData };
    }
}

function writeData(data) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.get('/api/status', (req, res) => {
    const data = readData();
    if (data.autoStatus) {
        const now = new Date();
        const currentHour = now.getHours();
        const { busyStart, busyEnd, autoBusyStatus, autoFreeStatus } = data;
        if (currentHour >= busyStart && currentHour < busyEnd) {
            data.status = autoBusyStatus || 'busy';
        } else {
            data.status = autoFreeStatus || 'free';
        }
    }
    res.json(data);
});

app.put('/api/status', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !tokens.has(authHeader.split(' ')[1])) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, role, status, fields, autoStatus, busyStart, busyEnd,
            autoBusyStatus, autoFreeStatus, typewriterEnabled, typewriterSpeed,
            language, diary, progressStartDate, clickSoundEnabled } = req.body;
    const data = readData();

    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (status !== undefined && ['free', 'busy', 'away'].includes(status)) data.status = status;
    if (autoStatus !== undefined) data.autoStatus = autoStatus;
    if (busyStart !== undefined) data.busyStart = busyStart;
    if (busyEnd !== undefined) data.busyEnd = busyEnd;
    if (autoBusyStatus !== undefined) data.autoBusyStatus = autoBusyStatus;
    if (autoFreeStatus !== undefined) data.autoFreeStatus = autoFreeStatus;
    if (typewriterEnabled !== undefined) data.typewriterEnabled = typewriterEnabled;
    if (typewriterSpeed !== undefined) data.typewriterSpeed = typewriterSpeed;
    if (language !== undefined) data.language = language;
    if (diary !== undefined) data.diary = diary;
    if (progressStartDate !== undefined) data.progressStartDate = progressStartDate;
    if (clickSoundEnabled !== undefined) data.clickSoundEnabled = clickSoundEnabled;
    if (fields !== undefined) data.fields = fields;

    writeData(data);
    res.json({ success: true, data });
});

app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = generateToken();
        tokens.add(token);
        setTimeout(() => tokens.delete(token), 24 * 60 * 60 * 1000);
        return res.json({ token });
    }
    res.status(401).json({ error: 'Sai mật khẩu' });
});

app.get('/api/auth', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && tokens.has(authHeader.split(' ')[1])) {
        return res.json({ valid: true });
    }
    res.status(401).json({ error: 'Invalid token' });
});

// Route cho trang About
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (req.path === '/admin' || req.path === '/admin.html') {
        return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🔗 Trang công khai: http://localhost:${PORT}/`);
    console.log(`⚙️ Trang quản trị: http://localhost:${PORT}/admin`);
    console.log(`🔑 Mật khẩu admin: ${ADMIN_PASSWORD}`);
});