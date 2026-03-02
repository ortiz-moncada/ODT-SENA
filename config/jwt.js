import 'dotenv/config';

export default {
    token_secreto: process.env.JWT_SECRET,
    expiracion: process.env.JWT_EXPIRE || '8h',
    token_refresh: process.env.JWT_REFRESH_SECRET,
    expiracion_refresh: process.env.JWT_REFRESH_EXPIRE || '1d'
};
