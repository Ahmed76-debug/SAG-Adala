const mongoose = require('mongoose');

// تعريف شكل بيانات المستخدم في قاعدة البيانات
const UserSchema = new mongoose.Schema({
    username: String,
    password: String, // ملاحظة: في المشاريع الحقيقية يتم تشفير الباسوورد
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default async function handler(req, res) {
    // السماح بالطلبات من أي مكان (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // الاتصال بقاعدة البيانات باستخدام الرابط الموجود في Vercel
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DATABASE_URL);
        }

        const { username, password } = req.body;

        // البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ username: username, password: password });

        if (user) {
            return res.status(200).json({ success: true, message: 'Welcome back!', user });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
}
