# Mitsafe Backend Foundation

This is the production-ready backend foundation for the Mitsafe application, built with Node.js, Express.js, MongoDB (Mongoose), and best practices in MVC architecture, security, and logging.

## Features

- **Runtime Environment**: Node.js with modern ES Modules configuration (`import`/`export`).
- **Database**: MongoDB integration via Mongoose with clean connection lifecycle management.
- **Robust Security Middleware**:
  - `helmet`: Security HTTP headers.
  - `cors`: Cross-Origin Resource Sharing.
  - `express-rate-limit`: Basic DDoS and brute-force protection.
  - `express-mongo-sanitize`: Protection against NoSQL query injections.
- **Robust Logging**: Winston logs with console and local file storage (`logs/all.log`, `logs/error.log`), seamlessly integrated with Morgan for incoming HTTP requests.
- **Request Verification & Validation**: Express Validator middleware structure.
- **Global Error Handling**: Custom API Error handler mapping MongoDB, Cast, validation, and JWT errors appropriately with environment segregation (development vs. production error details).
- **Authentication System**: Ready-to-use JWT verification and user role validation middleware.
- **Upload Pipeline**: Multer storage pipeline ready for handling files with type constraints.
- **Modular MVC Folder Layout**: Pre-structured directories for models, controllers, services, routes, and validation schemas.

---

## Directory Layout

```
Mitsafe-Backend/
├── src/
│   ├── app.js               # Express application initialization and middleware
│   ├── server.js            # Entry point: DB connection & Server boot
│   ├── config/              # Configuration files
│   │   ├── db.js            # Mongoose MongoDB configuration
│   │   └── logger.js        # Winston log levels and outputs
│   ├── controllers/         # Request handling & MVC controllers
│   ├── models/              # Mongoose schema models
│   ├── services/            # Core business logic handlers
│   ├── validators/          # Schemas for validation via express-validator
│   ├── middlewares/         # Custom Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validation.middleware.js
│   ├── routes/              # Express API version routes
│   │   └── index.js
│   └── utils/               # Common helper utilities
│       ├── apiError.js
│       └── asyncWrapper.js
├── logs/                    # Logging directory (automatically created)
├── uploads/                 # Uploaded files directory (automatically created)
├── .env.example             # Template for variables setup
├── .env                     # Local environment file (ignored by Git)
├── .gitignore
├── package.json
└── README.md
```

---

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a URI from MongoDB Atlas)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```
Fill out the variables inside `.env` to match your environment.

### 3. Running the Server

- **Development Mode** (with Nodemon hot-reloads):
  ```bash
  npm run dev
  ```

- **Production Mode**:
  ```bash
  npm start
  ```

---

## Verification Endpoints

Once the server is running on port `5000`:
- **API Health Check**:
  - Request: `GET http://localhost:5000/api/v1/health`
  - Response: `{ "status": "success", "message": "Server is healthy", "timestamp": "...", "uptime": ... }`
- **Base Root Router**:
  - Request: `GET http://localhost:5000/api/v1`
  - Response: `{ "status": "success", "message": "Welcome to Mitsafe API Version 1" }`
