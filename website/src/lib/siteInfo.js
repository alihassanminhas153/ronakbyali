/* One place for the shop's contact details. The footer and the Contact page both read from here,
   so you only ever change a number or an email once. */
export const BRAND = "Ronak By Ali";
export const OWNER = "Ali Hassan Minhas";
export const EMAIL = "ronakbyali@gmail.com";
export const WHATSAPP_DIGITS = "923218854601"; // used in the wa.me link (no + or spaces)
export const WHATSAPP_SHOWN = "+92 321 8854601";
export const WHATSAPP_TEXT = "Hello Ronak By Ali, I would like to ask about an order.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
export const LOGIN_PATH = "/welcome-back";
export const SIGNUP_PATH = "/create-account";
export const CUSTOM_STUDIO_PATH = "/custom-studio";