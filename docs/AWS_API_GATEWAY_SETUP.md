# AWS API Gateway Setup Guide

Huong dan nay tao AWS API Gateway HTTP API de frontend goi REST API backend dang chay sau Application Load Balancer. Socket.IO van di qua ALB rieng vi API Gateway WebSocket API khong thay the truc tiep duoc Socket.IO hien tai.

## 1. Kien truc

- Frontend REST API: `VITE_API_URL=https://<api-id>.execute-api.ap-southeast-1.amazonaws.com`
- Frontend Socket.IO: `VITE_SOCKET_URL=http://<alb-dns-name>` hoac domain HTTPS/WSS rieng cho ALB.
- API Gateway HTTP API proxy toi public ALB backend hien tai.
- Backend van giu ALB, Auto Scaling Group, EC2 private subnets va DocumentDB nhu da deploy.

Khong them `/api` vao `VITE_API_URL`, vi frontend code da goi cac path dang `/api/...`.

## 2. Bien PowerShell can co

```powershell
$AWS_REGION="ap-southeast-1"
$APP_NAME="webdating"

# Neu bien ALB_DNS bi mat, lay lai bang lenh o buoc 3.
$ALB_DNS="<backend-alb-dns-name>"

# Doi thanh frontend origin that khi deploy frontend.
$FRONTEND_ORIGIN="http://localhost:5173"
```

## 3. Lay ALB DNS hien tai

```powershell
$ALB_DNS = aws elbv2 describe-load-balancers `
  --region $AWS_REGION `
  --names "$APP_NAME-backend-alb" `
  --query "LoadBalancers[0].DNSName" `
  --output text

echo $ALB_DNS
```

Kiem tra backend sau ALB:

```powershell
curl.exe "http://$ALB_DNS/api/health"
curl.exe "http://$ALB_DNS/api/health/db"
```

## 4. Tao HTTP API voi CORS

Tao API:

```powershell
$API_ID = aws apigatewayv2 create-api `
  --region $AWS_REGION `
  --name "$APP_NAME-backend-http-api" `
  --protocol-type HTTP `
  --cors-configuration "AllowOrigins=$FRONTEND_ORIGIN,AllowMethods=GET,POST,PUT,PATCH,DELETE,OPTIONS,AllowHeaders=Content-Type,Authorization,Accept,AllowCredentials=true" `
  --query "ApiId" `
  --output text

echo $API_ID
```

Tao HTTP proxy integration toi ALB. Integration URI phai co `/{proxy}` de giu nguyen duong dan `/api/...`.

```powershell
$INTEGRATION_ID = aws apigatewayv2 create-integration `
  --region $AWS_REGION `
  --api-id $API_ID `
  --integration-type HTTP_PROXY `
  --integration-method ANY `
  --integration-uri "http://$ALB_DNS/{proxy}" `
  --payload-format-version "1.0" `
  --query "IntegrationId" `
  --output text

echo $INTEGRATION_ID
```

Tao route catch-all:

```powershell
aws apigatewayv2 create-route `
  --region $AWS_REGION `
  --api-id $API_ID `
  --route-key "ANY /{proxy+}" `
  --target "integrations/$INTEGRATION_ID"
```

Tao `$default` stage va auto deploy:

```powershell
aws apigatewayv2 create-stage `
  --region $AWS_REGION `
  --api-id $API_ID `
  --stage-name '$default' `
  --auto-deploy
```

Lay invoke URL:

```powershell
$API_GATEWAY_URL = aws apigatewayv2 get-api `
  --region $AWS_REGION `
  --api-id $API_ID `
  --query "ApiEndpoint" `
  --output text

echo $API_GATEWAY_URL
```

## 5. Cap nhat CORS khi co frontend domain that

Khi frontend da co domain, vi du `https://app.example.com`, cap nhat API Gateway CORS:

```powershell
$FRONTEND_ORIGIN="https://app.example.com"

aws apigatewayv2 update-api `
  --region $AWS_REGION `
  --api-id $API_ID `
  --cors-configuration "AllowOrigins=$FRONTEND_ORIGIN,AllowMethods=GET,POST,PUT,PATCH,DELETE,OPTIONS,AllowHeaders=Content-Type,Authorization,Accept,AllowCredentials=true"
```

Backend cung can cho phep origin nay. Neu backend dang lay `ALLOWED_ORIGINS` tu Secrets Manager trong user data, cap nhat secret/env tuong ung va refresh Auto Scaling Group.

```powershell
aws secretsmanager put-secret-value `
  --region $AWS_REGION `
  --secret-id "/webdating/backend/ALLOWED_ORIGINS" `
  --secret-string $FRONTEND_ORIGIN
```

Neu user data dang hard-code `ALLOWED_ORIGINS`, tao launch template version moi voi origin moi roi refresh ASG.

## 6. Test API Gateway

Smoke test:

```powershell
curl.exe "$API_GATEWAY_URL/api/health"
curl.exe "$API_GATEWAY_URL/api/health/db"
```

Expected:

```json
{"message":"OK"}
```

va DB health co `state` la `connected`.

Test route protected thieu token:

```powershell
curl.exe -i "$API_GATEWAY_URL/api/users/me"
```

Expected: `401`.

Test token hop le bang Postman:

- Base URL: `$API_GATEWAY_URL`
- Request: `POST {{base_url}}/api/users/onboarding`
- Authorization: `Bearer <Clerk token>`

## 7. Cau hinh frontend

Khi build/deploy frontend:

```env
VITE_API_URL=https://<api-id>.execute-api.ap-southeast-1.amazonaws.com
VITE_SOCKET_URL=http://<backend-alb-dns-name>
```

Neu frontend production chay HTTPS, nen cau hinh HTTPS cho ALB socket endpoint bang domain + ACM certificate, roi dung:

```env
VITE_SOCKET_URL=https://socket.example.com
```

## 8. Ghi chu quan trong

- HTTP API Gateway trong phase nay chi proxy REST API.
- Socket.IO van dung ALB. Dung chung API Gateway WebSocket API se can thiet ke lai realtime protocol.
- Neu API Gateway tra 502, kiem tra ALB DNS, route `ANY /{proxy+}` va integration URI `http://$ALB_DNS/{proxy}`.
- Neu frontend bi CORS, kiem tra ca API Gateway CORS va backend `ALLOWED_ORIGINS`.
- Neu API Gateway health OK nhung protected route 401, kiem tra Clerk token va `CLERK_SECRET_KEY` tren backend.
