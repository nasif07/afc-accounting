// The full logo (crest + wordmark) used on every printed or exported report:
// financial statements, the bank and petty cash cash books, the bank book
// statement and the payslip.
//
// The compact mark (/afc-logo.png) stays in place for app chrome — sidebar,
// login and register — where a wide wordmark doesn't fit.
//
// Served from frontend/public. The backend keeps its own copy at
// src/assets/afc-full-logo.jpg because the payslip PDF/DOCX are generated
// server-side and the backend image is built without the frontend folder.
export const REPORT_LOGO = "/afc-full-logo.jpg";

// 758x564 — landscape. Anything that sizes the logo should set one dimension
// and leave the other automatic, rather than forcing a portrait box.
export const REPORT_LOGO_ASPECT = 758 / 564;
