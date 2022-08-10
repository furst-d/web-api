const client = require('@sendgrid/mail');
client.setApiKey(process.env.SENDGRID_API_KEY);
const sender = process.env.EMAIL_SENDER;

module.exports = {
    sendRegistration: (email: string, name: string, token:string) => {
        client.send({
            to: {
                email: email,
                name: name,
            },
            from: {
                email: sender,
            },
            templateId: 'd-367fedd280004fa3a8743729a25972d1',
            dynamicTemplateData: {
                name: name,
                link: `${process.env.CLIENT_URL}/registration/${token}`,
            }
        }).then(() => {
            console.log("Email was sent");
        })
    },
}