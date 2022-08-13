export interface User {
    email: string;
    name: string;
    lastname: string;
    confirmation_token: string;
    permitted_pages: string;
}

export interface NotActivatedUser {
    token: string;
    password: string;
}