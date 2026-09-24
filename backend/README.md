# BizPulse Backend

Backend API for BizPulse, implemented as a Django REST API.

This directory contains the server-side application for the BizPulse monorepo. The backend is responsible for authentication, authorization, business data persistence, validation, and API-level domain rules. The frontend is responsible for the user interface and client-side state/derived calculations.

## Stack

* Python
* Django
* Django REST Framework
* SimpleJWT
* drf-spectacular
* django-cors-headers
* SQLite (development)

## Project Structure

```text
backend/
├── accounts/       # Authentication, users, businesses
├── finance/        # Customers, daily tallies, credit and repayment records
├── myapp/          # Django project configuration
├── manage.py
└── requirements.txt
```

## Local Setup

### 1. Enter the backend directory

From the repository root:

```bash
cd backend
```

### 2. Create a virtual environment

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it.

**Windows:**

```bash
.venv\Scripts\activate
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

After activation, your terminal should indicate that the virtual environment is active.

### 3. Install dependencies

Upgrade `pip`:

```bash
python -m pip install --upgrade pip
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### 4. Environment variables

Create a `.env` file in the backend directory.

The backend expects configuration such as:

```env
FRONTEND_URL=http://localhost:5173
DJANGO_SECRET_KEY='django-insecure-secret'
DJANGO_DEBUG=True
EMAIL_HOST_USER=example@gmail.com"
EMAIL_HOST_PASSWORD="abcd efgh ijkl mnop"
FRONTEND_URL="http://localhost:5173"
EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend"
```

For email delivery, configure the variables required by the selected email backend.

For local development, the project can use Django's console email backend. This prints verification and password-reset emails directly to the terminal instead of sending them. The default however is the smtp email backend.

For example:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "noreply@bizpulse.local"
```

Do not commit credentials or other secrets to the repository.

## Database Setup

After installing dependencies, apply migrations:

```bash
python manage.py migrate
```

If you have created model changes that do not yet have migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

To check for unapplied model changes without creating migration files:

```bash
python manage.py makemigrations --check
```

## Run the Development Server

Start Django from the backend directory:

```bash
python manage.py runserver
```

The API will normally be available at:

```text
http://127.0.0.1:8000/
```

## API Documentation

The backend exposes an OpenAPI schema and interactive Swagger documentation.

OpenAPI schema:

```text
/api/schema/
```

Swagger UI:

```text
/api/docs/
```

With the development server running:

```text
http://127.0.0.1:8000/api/schema/
http://127.0.0.1:8000/api/docs/
```

## Authentication

The API uses JWT authentication.

Authentication endpoints are under:

```text
/api/auth/
```

The authentication flow includes:

* Account registration
* Email verification
* Verification email resend
* Email/password login
* Access-token refresh
* Logout
* Email change
* Password change
* Password reset

Authenticated API requests use:

```http
Authorization: Bearer <access-token>
```

## Backend Development

Run Django's system checks with:

```bash
python manage.py check
```

Create migrations after model changes:

```bash
python manage.py makemigrations
```

Apply them:

```bash
python manage.py migrate
```

Run the test suite:

```bash
python manage.py test
```

## Email During Development

The backend uses email for account verification, email changes, and password resets.

For local development, the console email backend is useful because it avoids requiring an external email provider:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

Emails will be printed in the terminal running Django.

When testing actual email delivery, configure the appropriate SMTP settings through environment variables rather than committing credentials to the repository.

## API Design Notes

The backend follows a REST-oriented design using Django REST Framework generic class-based views.

Resources are scoped to the authenticated user's businesses. Resources belonging to another user are intentionally treated as not found rather than exposing their existence.

The backend stores authoritative financial facts and derives financial states and metrics from those records rather than persisting redundant calculated values.

Examples include:

* Cash sales are stored as daily tally data.
* Credit sales are represented by credit records.
* Repayments reduce outstanding credit but do not create additional sales.
* Business ownership determines access to related financial records.

## Development Workflow

From a clean checkout:

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate
python manage.py check
python manage.py runserver
```

The frontend can be run independently from its own directory in the monorepo.
