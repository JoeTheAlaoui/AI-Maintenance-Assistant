# File Upload API - Testing Guide

## cURL Test Commands

### 1. Test PDF Upload (Success)
```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/manual.pdf"
```

### 2. Test Image Upload (Success)
```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/nameplate.jpg"
```

### 3. Test Invalid File Type (Should Fail - 400)
```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/document.docx"
```

### 4. Test Unauthorized (Should Fail - 401)
```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -F "file=@/path/to/manual.pdf"
```

### 5. Test Rate Limit (11th upload in 1 hour - Should Fail - 429)
```bash
# Run this 11 times quickly
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/assets/upload \
    -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN" \
    -F "file=@/path/to/manual.pdf"
done
```

## Expected Responses

### Success (200)
```json
{
  "success": true,
  "file_url": "https://your-project.supabase.co/storage/v1/object/public/ai-uploads/user-id/1234567890_manual_pdf",
  "file_name": "manual_pdf",  
  "file_size_bytes": 2048576,
  "file_type": "application/pdf",
  "uploaded_at": "2024-12-09T03:51:00.000Z"
}
```

### Invalid File Type (400)
```json
{
  "success": false,
  "error": "Type de fichier non autorisé. Acceptés: PDF, JPEG, PNG"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Non autorisé"
}
```

### File Too Large (413)
```json
{
  "success": false,
  "error": "Fichier trop volumineux (max: 50MB, reçu: 75MB)"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "error": "Limite d'uploads atteinte (10 par heure)"
}
```

## Testing with Postman

1. Create new POST request to `http://localhost:3000/api/assets/upload`
2. Go to "Body" tab → Select "form-data"
3. Add key "file" → Change type to "File" → Select file
4. Add your session cookie in Headers:
   - Key: `Cookie`
   - Value: `sb-access-token=YOUR_TOKEN`
5. Send request

## Getting Session Token

In browser console (while logged in):
```javascript
document.cookie.split('; ').find(row => row.startsWith('sb-access-token'))
```
