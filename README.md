# DukanBook – Smart Shop Ledger

A full-stack web application for local shopkeepers to manage customer credit (udhar), track shop borrowing, record cash sales, and receive automatic due-date reminders.

> **DukanBook** — *Dukan* (دکان) means shop in Urdu/Hindi. *Book* means ledger. Together: your shop's smart account book.

---

## Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Backend        | Node.js + Express.js            |
| Database       | MongoDB + Mongoose              |
| Authentication | JWT + bcryptjs                  |
| Scheduler      | node-cron                       |
| Frontend       | Vanilla HTML + CSS + JavaScript |
| Icons          | Font Awesome 6 Free (CDN)       |

---

## Features

- Shopkeeper registration & login (JWT-based auth)
- Customer management — add, edit, search, delete
- Customer Udhar — add items, auto-calculate totals, due date tracking
- Partial payment recording with running balance
- Carry-forward remaining balance to a new due date
- Shop Borrow — track credit taken from suppliers
- Cash Sales — record and print receipts
- Filter by status, date, customer + live search + pagination
- Mark records as fully paid
- Dashboard with live stats and recent transactions
- Daily cron job for due-date reminders (8:00 AM)
- Notification center with read/unread tracking
- Print Udhar Slip (opens in new window)
- Export to PDF (browser print)
- Shopkeeper profile page (edit name, shop name, address)
- Dark mode toggle (saved to localStorage)
- Fully responsive — mobile-friendly sidebar

---

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org) v16+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, or a [MongoDB Atlas](https://cloud.mongodb.com) connection string

### 1. Navigate to the project folder

```bash
cd "c:\Users\Nazim Pahore\Music\DukanBook"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Edit the `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/shop_udhar
JWT_SECRET=shop_udhar_super_secret_key_2024
JWT_EXPIRE=7d
NODE_ENV=development
```

> For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

### 4. Start the server

```bash
npm start
```

For development with auto-reload (requires `nodemon`):

```bash
npm run dev
```

### 5. Open in browser

Navigate to: **http://localhost:5000**

---

## Folder Structure

```
project-root/
│
├── server/
│   ├── config/
│   │   └── db.js                       # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   ├── customerUdharController.js
│   │   ├── shopBorrowController.js
│   │   ├── saleController.js
│   │   ├── dashboardController.js
│   │   └── notificationController.js
│   ├── jobs/
│   │   └── reminderJob.js              # Daily cron job (8:00 AM)
│   ├── middleware/
│   │   ├── auth.js                     # JWT verification
│   │   └── errorHandler.js             # Centralized error handling
│   ├── models/
│   │   ├── User.js
│   │   ├── Customer.js
│   │   ├── CustomerUdhar.js
│   │   ├── ShopBorrow.js
│   │   ├── Sale.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── customerUdharRoutes.js
│   │   ├── shopBorrowRoutes.js
│   │   ├── saleRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── notificationRoutes.js
│   └── server.js                       # Express entry point
│
├── public/
│   ├── css/
│   │   └── style.css                   # All styles with dark mode support
│   ├── js/
│   │   ├── app.js                      # Router, API wrapper, utilities
│   │   ├── auth.js                     # Login / Register handlers
│   │   ├── dashboard.js                # Dashboard stats & recent transactions
│   │   ├── customers.js                # Customer CRUD
│   │   ├── customerUdhar.js            # Customer credit records & payments
│   │   ├── shopBorrow.js               # Shop borrow records
│   │   ├── sales.js                    # Cash sales & receipt printing
│   │   ├── notifications.js            # Notification center
│   │   └── profile.js                  # Shopkeeper profile editor
│   └── index.html                      # SPA shell
│
├── uploads/                            # File upload directory
├── .env                                # Environment variables
├── package.json
└── README.md
```

---

## API Endpoints

### Auth

| Method | Endpoint              | Description          | Auth   |
| ------ | --------------------- | -------------------- | ------ |
| POST   | `/api/auth/register`  | Register shopkeeper  | Public |
| POST   | `/api/auth/login`     | Login                | Public |
| GET    | `/api/auth/me`        | Get current user     | Yes    |
| PUT    | `/api/auth/profile`   | Update profile       | Yes    |

### Customers

| Method     | Endpoint             | Description             | Auth |
| ---------- | -------------------- | ----------------------- | ---- |
| GET / POST | `/api/customers`     | List all / Add customer | Yes  |
| PUT        | `/api/customers/:id` | Update customer         | Yes  |
| DELETE     | `/api/customers/:id` | Delete customer         | Yes  |

### Customer Udhar

| Method     | Endpoint                                  | Description            | Auth |
| ---------- | ----------------------------------------- | ---------------------- | ---- |
| GET / POST | `/api/customer-udhar`                     | List all / Add record  | Yes  |
| PUT        | `/api/customer-udhar/:id`                 | Update record          | Yes  |
| DELETE     | `/api/customer-udhar/:id`                 | Delete record          | Yes  |
| PATCH      | `/api/customer-udhar/:id/paid`            | Mark fully paid        | Yes  |
| PATCH      | `/api/customer-udhar/:id/partial-payment` | Record partial payment | Yes  |
| POST       | `/api/customer-udhar/:id/carry-forward`   | Carry forward balance  | Yes  |

### Shop Borrow

| Method     | Endpoint                    | Description           | Auth |
| ---------- | --------------------------- | --------------------- | ---- |
| GET / POST | `/api/shop-borrow`          | List all / Add record | Yes  |
| PUT        | `/api/shop-borrow/:id`      | Update record         | Yes  |
| DELETE     | `/api/shop-borrow/:id`      | Delete record         | Yes  |
| PATCH      | `/api/shop-borrow/:id/paid` | Mark as paid          | Yes  |

### Sales

| Method     | Endpoint         | Description         | Auth |
| ---------- | ---------------- | ------------------- | ---- |
| GET / POST | `/api/sales`     | List all / Add sale | Yes  |
| PUT        | `/api/sales/:id` | Update sale         | Yes  |
| DELETE     | `/api/sales/:id` | Delete sale         | Yes  |

### Dashboard & Notifications

| Method | Endpoint                          | Description          | Auth |
| ------ | --------------------------------- | -------------------- | ---- |
| GET    | `/api/dashboard/stats`            | Dashboard statistics | Yes  |
| GET    | `/api/notifications`              | List notifications   | Yes  |
| PATCH  | `/api/notifications/:id/read`     | Mark one as read     | Yes  |
| PATCH  | `/api/notifications/read-all`     | Mark all as read     | Yes  |

---

## Notification / Reminder System

The daily cron job runs every day at **8:00 AM** and:

1. Finds all Pending records with `dueDate <= today`
2. Creates a Notification document in the database
3. Logs a mock SMS/WhatsApp message to the console

To integrate real SMS/WhatsApp APIs, edit `server/jobs/reminderJob.js` and replace the `sendReminder()` mock function with [Twilio](https://twilio.com) or [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) calls.

---

## Security

- Passwords hashed with **bcryptjs** (salt rounds: 10)
- JWT tokens expire after **7 days**
- All API routes (except login/register) require a valid JWT
- Shopkeepers can only see their own data (userId scoping)
- Duplicate phone numbers per shopkeeper prevented via DB index

---

## Dark Mode

Click the moon icon in the sidebar footer to toggle dark mode. The preference is saved in `localStorage` and restored on next visit.
