# Library API

A RESTful library management API built with Node.js, Express, MongoDB, and Mongoose. The API manages users, authors, categories, books, and borrowing records, with JWT authentication and Swagger documentation.

## Features

- User registration, login, logout, token refresh, and profile access
- Password hashing with `bcrypt`
- JWT access tokens and refresh tokens stored in an HTTP-only cookie
- CRUD-style operations for users, authors, categories, books, and borrows
- MongoDB relationships using Mongoose references and `populate()`
- Pagination on users, authors, categories, and books
- Password-reset email flow using Nodemailer
- Request logging, security headers, and rate limiting
- Interactive API documentation through Swagger UI

## Tech stack

- Node.js
- Express 5
- MongoDB and Mongoose
- JSON Web Tokens
- EJS
- Swagger / OpenAPI

## Project structure

```text
.
├── controllers/       Request handlers and business logic
├── middleware/        Authentication, validation, and error handling
├── models/            Mongoose schemas
├── routes/            Express route definitions
├── services/          Supporting application services
├── utils/             Validation and utility helpers
├── views/             EJS pages, including password reset
├── config.env         Local environment variables
└── server.js          Application entry point
```

## Requirements

- Node.js 18 or newer
- A running MongoDB instance or MongoDB Atlas database
- SMTP credentials for the password-reset email feature

## Installation

1. Clone the repository and enter the project directory.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create or update `config.env` in the project root:

   ```env
   PORT=3000
   MONGO_URL=mongodb://127.0.0.1:27017/library
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_REFRESH_SECRET=replace-with-another-long-random-secret
   USER_MAIL=your-email@example.com
   USER_PASS=your-email-app-password
   BASE_URL=http://localhost:3000
   ```

   `USER_MAIL` and `USER_PASS` are used only for sending password-reset emails. For Gmail, use an app password rather than your normal account password.

4. Start the development server:

   ```bash
   npm start
   ```

The API runs at `http://localhost:3000` unless another port is configured.

## API documentation

Open Swagger UI at:

```text
http://localhost:3000/api-docs
```

## Authentication

Register or log in to receive an access token:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```

For protected routes, send the access token in the `Authorization` header:

```http
Authorization: Bearer <access-token>
```

Access tokens expire after 15 minutes. Use `POST /api/auth/refresh` with the refresh token cookie, or include a refresh token in the request body, to obtain a new token.

## Endpoints

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in and receive tokens |
| GET | `/api/auth/profile` | Get the authenticated user profile |
| POST | `/api/auth/refresh` | Refresh access and refresh tokens |
| POST | `/api/auth/logout` | Log out and invalidate stored tokens |
| POST | `/api/auth/forget-password` | Send a password-reset email |
| GET | `/api/auth/reset-password/:userId/:token` | Display the reset-password page |
| POST | `/api/auth/reset-password/:userId/:token` | Set a new password |

### Users

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/users` | List users; supports `page` and `limit` |
| POST | `/api/users` | Create a user |
| GET | `/api/users/:userId` | Get one user |
| PATCH | `/api/users/:userId` | Update a user |
| DELETE | `/api/users/:userId` | Delete a user |
| GET | `/api/users/:userId/borrows` | List a user’s borrowing records |
| POST | `/api/users/:userId/borrows` | Create a borrowing record for a user |

### Authors and books

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/authors` | List authors; supports `page` and `limit` |
| POST | `/api/authors` | Create an author |
| GET | `/api/authors/:authorId` | Get one author |
| PATCH | `/api/authors/:authorId` | Update an author |
| GET | `/api/authors/:authorId/books` | List books by an author |
| GET | `/api/books` | List books; supports `page` and `limit` |
| POST | `/api/books` | Create a book |
| GET | `/api/books/:bookId` | Get one book |
| GET | `/api/books/:bookId/borrows` | List borrowing records for a book |

### Categories

The current route prefix is `/api/categorys` for compatibility with the existing implementation.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/categorys` | List categories; supports `page` and `limit` |
| POST | `/api/categorys` | Create a category |
| GET | `/api/categorys/:categoryId` | Get one category |
| GET | `/api/categorys/:categoryId/books` | List books in a category |

### Borrows

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/borrows` | List all borrowing records |
| POST | `/api/borrows` | Borrow a book |
| PATCH | `/api/borrows/:borrowId` | Mark a borrowing record as returned or update it |

Borrow records use the statuses `borrowed` and `returned`. A book cannot be borrowed while another active borrowing record exists for it.

## Data relationships

```text
User      1 ──── * Borrow * ──── 1 Book
Author    1 ──── * Book
Category  1 ──── * Book
```

Books reference an author and a category. Borrow records reference both a user and a book. Book and borrow list responses populate their related documents where implemented.

## Example requests

Create an author:

```bash
curl -X POST http://localhost:3000/api/authors \
  -H "Content-Type: application/json" \
  -d '{"name":"Naguib Mahfouz","bio":"Egyptian novelist"}'
```

Create a book using existing author and category IDs:

```json
{
  "title": "Example Book",
  "description": "A short description",
  "publishedYear": 2024,
  "author": "AUTHOR_ID",
  "category": "CATEGORY_ID"
}
```

Borrow a book:

```json
{
  "user": "USER_ID",
  "book": "BOOK_ID"
}
```

## Notes

- Do not commit `config.env` or real credentials. Use environment-specific secrets locally and in deployment.
- The global rate limiter allows up to 100 requests per five-minute window per client.
- Error responses include a status, message, and HTTP status code where applicable.
- The existing `Library_API_README.md` contains the original Arabic learning brief for the project.

## License

This project currently uses the ISC license declared in `package.json`.
