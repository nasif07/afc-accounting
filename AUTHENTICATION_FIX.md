# Authentication Fix Documentation

## Overview

This document describes the comprehensive fixes applied to resolve authentication issues in the Alliance Accounting System. The system has been migrated from localStorage-based JWT tokens to secure **httpOnly cookies** for improved security and proper authentication flow.

## Issues Resolved

### 1. **Cookie Not Being Set During Login**
**Problem:** The backend was setting cookies correctly, but the frontend wasn't configured to accept them.

**Solution:** 
- Enabled `withCredentials: true` in Axios configuration
- Updated CORS settings to allow credentials
- Ensured backend cookie configuration is correct

### 2. **GET /api/auth/me Returns 401 Unauthorized**
**Problem:** The authentication middleware was only checking the `Authorization` header (Bearer token), not cookies.

**Solution:**
- Updated backend `auth.js` middleware to check cookies first
- Falls back to Authorization header for backward compatibility
- Middleware now properly reads `req.cookies.token`

### 3. **Frontend-Backend Token Storage Mismatch**
**Problem:** 
- Backend stores token in httpOnly cookies
- Frontend was reading from localStorage and sending via Authorization header
- This mismatch caused authentication failures

**Solution:**
- Removed localStorage token storage from authSlice
- Updated Axios to automatically send cookies with all requests
- Frontend now relies on cookies managed by the backend

## Changes Made

### Backend Changes

#### 1. **src/middleware/auth.js** - Updated Authentication Middleware
```javascript
// NOW CHECKS COOKIES FIRST, THEN FALLS BACK TO HEADER
const auth = (req, res, next) => {
  try {
    // Try to get token from cookies first
    let token = req.cookies?.token;
    
    if (!token) {
      // Fallback to Authorization header for backward compatibility
      token = req.header("Authorization")?.replace("Bearer ", "");
    }

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token is not valid",
    });
  }
};
```

**Key Improvements:**
- ✅ Reads token from `req.cookies.token` (httpOnly cookie)
- ✅ Falls back to Authorization header for backward compatibility
- ✅ Properly validates JWT and attaches user to request

### Frontend Changes

#### 1. **src/services/api.js** - Updated Axios Configuration
```javascript
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (httpOnly cookies)
  withCredentials: true,
});
```

**Key Improvements:**
- ✅ `withCredentials: true` ensures cookies are sent with every request
- ✅ Removed manual token injection from localStorage
- ✅ Cookies are now automatically managed by the browser

#### 2. **src/store/slices/authSlice.js** - Updated Redux Auth State
```javascript
// Key changes:
- Removed token from Redux state (now managed by browser cookies)
- Removed localStorage.setItem('token') calls
- Updated thunks to use API instance with credentials
- getCurrentUser() now relies on cookies being sent automatically
- logoutAsync() clears cookies via backend endpoint
```

**Key Improvements:**
- ✅ Token no longer stored in Redux or localStorage
- ✅ Uses centralized API instance with `withCredentials: true`
- ✅ Cleaner state management without token duplication

#### 3. **src/App.jsx** - Updated App Initialization
```javascript
useEffect(() => {
  // Check if user is authenticated via cookie on app load
  dispatch(getCurrentUser());
}, [dispatch]);
```

**Key Improvements:**
- ✅ Calls `getCurrentUser()` on app load to validate cookie
- ✅ Removed token from localStorage check
- ✅ Properly initializes authentication state

#### 4. **src/components/ProtectedRoute.jsx** - Enabled Route Protection
```javascript
// Re-enabled authentication check
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

**Key Improvements:**
- ✅ Protected routes now properly check authentication status
- ✅ Redirects to login if not authenticated

## Authentication Flow (Updated)

### Login Flow
```
1. User submits credentials on /login page
2. Frontend calls POST /api/auth/login with email & password
3. Backend validates credentials and generates JWT
4. Backend sets JWT in httpOnly cookie via res.cookie()
5. Backend returns user data in response body
6. Frontend stores user info in Redux (not token)
7. Frontend redirects to /dashboard
8. Browser automatically sends cookie with subsequent requests
```

### Protected Route Access Flow
```
1. User navigates to protected route (e.g., /students)
2. ProtectedRoute component checks Redux isAuthenticated state
3. If not authenticated, redirects to /login
4. If authenticated, renders protected component
5. All API requests include cookie automatically (withCredentials: true)
6. Backend middleware reads cookie and validates JWT
7. Request proceeds if token is valid
```

### Logout Flow
```
1. User clicks logout button
2. Frontend calls POST /api/auth/logout
3. Backend clears cookie via res.clearCookie('token')
4. Frontend clears Redux state
5. Frontend redirects to /login
6. Cookie is removed from browser
```

## Security Improvements

### 1. **httpOnly Cookies**
- ✅ Tokens stored in httpOnly cookies (not accessible via JavaScript)
- ✅ Prevents XSS attacks from stealing tokens
- ✅ Browser automatically sends cookies with requests

### 2. **Secure Flag**
- ✅ In production, cookies are sent only over HTTPS
- ✅ `secure: process.env.NODE_ENV === "production"`

### 3. **SameSite Policy**
- ✅ `sameSite: "strict"` prevents CSRF attacks
- ✅ Cookies only sent to same-site requests

### 4. **CORS with Credentials**
- ✅ Backend CORS allows credentials: `credentials: true`
- ✅ Frontend Axios sends credentials: `withCredentials: true`
- ✅ Proper cross-origin authentication

## Environment Configuration

### Backend (.env)
```
NODE_ENV=development  # or production
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_secret_key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Testing the Authentication

### 1. **Test Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alliance.com","password":"password123"}' \
  -c cookies.txt
```

### 2. **Test Protected Route with Cookie**
```bash
curl http://localhost:5000/api/auth/me \
  -b cookies.txt
```

### 3. **Frontend Testing**
- Navigate to http://localhost:5173/login
- Enter test credentials (admin@alliance.com / password123)
- Should redirect to dashboard
- Check browser DevTools → Application → Cookies
- Should see `token` cookie with httpOnly flag

## Backward Compatibility

The authentication middleware maintains backward compatibility:
- ✅ Still accepts Authorization header with Bearer token
- ✅ Checks cookies first, then falls back to header
- ✅ Allows gradual migration from header-based to cookie-based auth

## Common Issues & Solutions

### Issue: Cookie Not Appearing in Browser
**Solution:** 
- Ensure `withCredentials: true` in Axios
- Check CORS settings include `credentials: true`
- Verify backend sets cookie correctly

### Issue: 401 Unauthorized on Protected Routes
**Solution:**
- Verify cookie is being sent (check Network tab)
- Ensure JWT_SECRET matches between login and validation
- Check token expiration (maxAge: 7 days)

### Issue: Logout Not Clearing Cookie
**Solution:**
- Verify backend calls `res.clearCookie('token')`
- Check cookie path and domain match
- Clear browser cache and cookies manually

## Files Modified

### Backend
- `src/middleware/auth.js` - Updated to read cookies

### Frontend
- `src/services/api.js` - Added withCredentials
- `src/store/slices/authSlice.js` - Removed localStorage token handling
- `src/App.jsx` - Updated initialization logic
- `src/components/ProtectedRoute.jsx` - Re-enabled protection

## Deployment Notes

### Production Deployment
1. Set `NODE_ENV=production` in backend
2. Update `CORS_ORIGIN` to your frontend domain
3. Ensure HTTPS is enabled (required for secure cookies)
4. Update `VITE_API_URL` to production API URL
5. Test authentication flow in production environment

### Development
- Keep `NODE_ENV=development`
- Cookies work over HTTP in development
- Test with browser DevTools

## References

- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [Axios Documentation](https://axios-http.com/)
- [Express Cookie Parser](https://expressjs.com/en/resources/middleware/cookie-parser.html)
