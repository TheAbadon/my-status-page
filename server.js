// ===== server.js =====
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Bắt buộc phải có ADMIN_PASSWORD trong .env =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.error('❌ Lỗi: Thiếu ADMIN_PASSWORD trong file .env');
    console.error('   Hãy tạo file .env và thêm dòng: ADMIN_PASSWORD=mat_khau_cua_ban');
    process.exit(1); // Dừng server ngay
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data', 'status.json');

// Token đơn giản
const tokens = new Set();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Dữ liệu mặc định
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
        { key: 'avatar', label: 'Ảnh đại diện', value: '/images/avatar.jpg' },
        { key: 'github', label: 'GitHub', value: 'https://github.com/TheAbadon' },
        { key: 'facebook', label: 'Facebook', value: 'https://www.facebook.com/Z2T.Prime.13.06.2008.gobrrrrrrrrrrrrrrrrrrrrrrrrrr/' },
        { key: 'countdownEvent', label: 'Tên sự kiện đếm ngược', value: 'Tết dương lịch' },
        { key: 'countdownDate', label: 'Thời điểm sự kiện', value: '2027-01-01 07:00:00' },
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

// === API Routes ===

// GET: Lấy trạng thái công khai (có tự động đổi status nếu autoStatus bật)
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

// PUT: Cập nhật trạng thái (cần auth)
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

// POST: Đăng nhập admin
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = generateToken();
        tokens.add(token);
        // Token hết hạn sau 24h
        setTimeout(() => tokens.delete(token), 24 * 60 * 60 * 1000);
        return res.json({ token });
    }
    res.status(401).json({ error: 'Sai mật khẩu' });
});

// GET: Kiểm tra token
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

// Fallback route
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
    // Không log mật khẩu nữa
});