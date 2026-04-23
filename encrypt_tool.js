const crypto = require('crypto');
const masterKey = '4ebcb9dd5843a0e69b0fa65d3ec8d01d';
const algorithm = 'aes-256-gcm';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(masterKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

console.log(encrypt(process.argv[2] || 'mebot_secure_2026'));
