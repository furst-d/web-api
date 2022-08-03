const crypt = require('crypto-js');

export function encrypt (data: string): string {
    return crypt.AES.encrypt(data, crypt.enc.Utf8.parse(process.env.AES_ENCRYPT_KEY), {
        iv: crypt.enc.Utf8.parse(process.env.AES_INIT_VECTOR),
        mode: crypt.mode.CBC
    }).toString();
}