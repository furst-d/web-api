const crypt = require('crypto');

module.exports = {
    encrypt: (data: string) => {
        let cipher = crypt.createCipheriv('aes-256-cbc', process.env.AES_ENCRYPT_KEY, process.env.AES_INIT_VECTOR);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },
    decrypt: (encryptedData: string) => {
        let decipher = crypt.createDecipheriv('aes-256-cbc', process.env.AES_ENCRYPT_KEY, process.env.AES_INIT_VECTOR);
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        return (decrypted + decipher.final('utf8'));
    }
}