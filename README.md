# UNO Friends — Telegram Mini App (online multiplayer)

Bu versiya do‘stlar bilan internet orqali bir xonada o‘ynash uchun Socket.IO serveridan foydalanadi.

## Ishga tushirish (kompyuter)
1. Node.js 18+ o‘rnat.
2. Terminalda loyiha papkasında `npm install` buyrug‘ini bajar.
3. `npm start` buyrug‘ini bajar.
4. Brauzerda `http://localhost:3000` ni och. Ikki xil brauzer/qurilmadan sinab ko‘rish mumkin.

## Internetga chiqarish
Loyihani GitHub repositoryga joylab, Render kabi Node.js hostingda Web Service sifatida deploy qil:
- Build command: `npm install`
- Start command: `npm start`
- Root directory: loyiha ildizi
Hosting bergan HTTPS URL manzilni ochib tekshir.

## Telegram botga ulash
1. Telegramda `@BotFather` ga `/newbot` yuborib bot yarat.
2. BotFather menyusidan Web App / Menu Button sozlamasiga kir.
3. Deploy qilingan HTTPS URL ni Mini App URL qilib belgila.
4. Bot havolasini do‘stlaringga yubor.

## Muhim
- Xonaga 2–10 kishi ulanadi; xona kodi orqali qo‘shiladi.
- Server hozircha xonalarni xotirada saqlaydi. Server qayta ishga tushsa, xonalar o‘chadi.
- Bu boshlang‘ich multiplayer prototip. Turnir, doimiy profil, reyting va reconnect kabi funksiyalar hali qo‘shilmagan.
- Barcha o‘yinchilar uchun bir xil internet serveri ochiq bo‘lishi shart. Faqat telefon ichida ochilgan lokal fayl bilan uzoqdagi do‘stlar ulana olmaydi.
