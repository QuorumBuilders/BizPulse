# BizPulse Authentication Flow

## 1. Authentication model

BizPulse uses **JWT authentication**.

The frontend should treat authentication as two separate concerns:

1. **Access token** — used for normal authenticated API requests.
2. **Refresh token** — used to obtain a new access token when the access token expires.

The backend does not use session-based authentication for the API.

---

## 2. Registration flow

### Request

```http
POST /api/auth/register/
```

The frontend submits the user's registration information.

After successful registration, the backend creates the account but **does not allow the user to log in normally until their email has been verified**.

### Behaviour

```text
Register
   ↓
Account created
   ↓
Verification email sent
   ↓
User verifies email
   ↓
User can log in
```

The frontend should therefore show a clear "check your email" state after successful registration.

---

## 3. Email verification

Email verification is handled through the verification endpoint.

The verification system also supports email-change verification. The backend determines the operation from the verification record's purpose.

The frontend does not need to determine the purpose itself.

Conceptually:

```text
Verification link/token
        ↓
Backend verification endpoint
        ↓
Backend determines purpose
        ↓
Account/email state updated
```

After successful signup verification, the user's account becomes eligible for login.

---

## 4. Login

### Request

```http
POST /api/auth/token/
```

The frontend sends the user's credentials.

### Successful response

The backend returns:

```json
{
    "access": "<access-token>",
    "refresh": "<refresh-token>"
}
```

The frontend should store the tokens using the application's chosen secure storage strategy.

After login:

```text
Login successful
      ↓
Store access + refresh tokens
      ↓
Authenticated application state
      ↓
Fetch user's BizPulse data
```

---

## 5. Unverified account

If a user attempts to log in before verifying their email, login is rejected.

The backend returns a message indicating that the user must verify their email.

The frontend should **not treat this as an incorrect-password state**.

Instead, it should present something equivalent to:

> Please verify your email before logging in.

The UI may provide a "Resend verification email" action if that functionality is exposed by the backend.

---

## 6. Authenticated API requests

Every authenticated request should include:

```http
Authorization: Bearer <access-token>
```

For example:

```http
GET /api/businesses/
Authorization: Bearer eyJ...
```

The frontend API client should handle this automatically rather than requiring individual API functions to manually construct the header.

---

## 7. Access-token expiration

When the access token expires, an authenticated request may return:

```http
401 Unauthorized
```

The frontend should then attempt to refresh the token.

### Refresh

```http
POST /api/auth/token/refresh/
```

with the refresh token.

Conceptually:

```text
API request
    ↓
401
    ↓
Refresh access token
    ↓
Store new access token
    ↓
Retry original request
```

The original request should be retried **only after the refresh succeeds**.

---

## 8. Refresh failure

If refreshing fails, the authentication session should be considered invalid.

For example:

```text
API request
    ↓
401
    ↓
Refresh attempt
    ↓
Refresh fails
    ↓
Clear authentication state
    ↓
Redirect/show login
```

The frontend should not repeatedly attempt refresh after a failed refresh.

This prevents an infinite:

```text
401 → refresh → 401 → refresh → ...
```

loop.

---

## 9. Logout

### Request

```http
POST /api/auth/logout/
```

The frontend sends the authenticated request according to the backend's logout contract.

After logout, the frontend should:

1. Clear the access token.
2. Clear the refresh token.
3. Clear authenticated user state.
4. Return the user to the unauthenticated/login state.

Local application data should only be cleared according to the application's offline-data policy; logging out does not automatically imply that every locally cached BizPulse record must be deleted.

---

## 10. Password reset

Password reset is an unauthenticated flow.

Conceptually:

```text
Forgot password
      ↓
Request password reset
      ↓
Backend sends email
      ↓
User follows reset link
      ↓
Frontend presents new-password form
      ↓
Backend validates reset request
      ↓
Password changed
      ↓
User logs in normally
```

The frontend should never attempt to determine whether a reset token is valid itself. That is a backend responsibility.

---

## 11. Change password

An authenticated user can change their password through the authenticated password-change endpoint.

The frontend should require the appropriate existing/new password fields and submit them to the backend.

A successful password change should update the UI state accordingly. If the backend invalidates existing authentication tokens as part of the operation, the frontend should follow the resulting authentication response rather than assuming the current session remains valid.

---

## 12. Change email

Email change is a two-step verification process.

Conceptually:

```text
Authenticated user
        ↓
Request email change
        ↓
Backend creates email-change verification
        ↓
Verification email sent
        ↓
User verifies
        ↓
Backend changes email
```

The frontend should not immediately treat the new email as the verified account email merely because the change request succeeded.

The change becomes effective after verification.

---

## 13. Frontend auth state

A useful frontend state model is:

```text
loading
authenticated
unauthenticated
```

On application startup:

```text
App starts
   ↓
Check stored authentication state
   ↓
Do we have usable credentials?
   ├── No → unauthenticated
   │
   └── Yes
        ↓
      Request authenticated data
        ↓
      authenticated
```

The frontend should avoid briefly rendering the authenticated application while authentication is still being resolved. Use an initial loading/bootstrap state.

---

## 14. API client responsibility

The API client should be responsible for authentication mechanics.

A simplified architecture:

```text
src/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── businesses.ts
│   ├── daily_tallies.ts
│   ├── credits.ts
│   └── ...
│
└── auth/
    ├── AuthProvider
    └── ...
```

`client.ts` handles things such as:

* Base API URL
* Authorization header
* Access-token handling
* Refresh handling
* Common API errors

`auth.ts` handles authentication operations such as:

* Register
* Login
* Logout
* Verify email
* Request password reset
* Reset password
* Change password
* Request email change

Individual resource modules should not implement their own authentication logic.

---

## 15. Important frontend/backend boundary

The frontend is responsible for **authentication state and user experience**.

The backend remains authoritative for:

* Whether credentials are valid.
* Whether an email is verified.
* Whether a token is valid.
* Whether a user is authenticated.
* Whether a user is authorized to access a resource.
* Whether a password/email change is valid.

The frontend should never assume that because something exists in local state, the backend will accept it.

For every protected operation:

```text
Frontend authentication state
        ↓
API request
        ↓
Backend authentication
        ↓
Backend authorization
        ↓
Backend validation
        ↓
Response
```

This is particularly important for BizPulse because the frontend will eventually support offline operation. **Offline authentication state is not equivalent to backend authorization.**

---

## 16. Summary flow

### New user

```text
Register
  ↓
Verify email
  ↓
Login
  ↓
Access + refresh tokens
  ↓
Use BizPulse
```

### Existing user

```text
Login
  ↓
Access + refresh tokens
  ↓
Use API
  ↓
Access token expires
  ↓
Refresh
  ↓
Continue
```

### Expired session

```text
API request
  ↓
401
  ↓
Refresh token
  ├── Success → retry request
  │
  └── Failure → logout locally → login screen
```

### Password recovery

```text
Forgot password
  ↓
Email
  ↓
Reset password
  ↓
Login
```

### Email change

```text
Request email change
  ↓
Verification email
  ↓
Verify
  ↓
New email becomes verified
```

The frontend should implement these flows around the backend API rather than duplicating authentication rules in the client.
