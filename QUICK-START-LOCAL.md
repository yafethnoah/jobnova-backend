# JobNova V12 local quick start

1. Frontend `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:4000
EXPO_PUBLIC_USE_MOCK_API=false
```

2. Backend `.env` minimum for local mode:

```
PORT=4000
NODE_ENV=development
ALLOW_LOCAL_FALLBACK=true
JWT_SECRET=replace_with_a_long_random_secret_value
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
REDIS_URL=
PG_CONNECT_TIMEOUT_MS=3000
PG_IDLE_TIMEOUT_MS=10000
PG_POOL_MAX=10
```

3. Start backend:

```
cd backend
npm install
npm start
```

4. Test from your phone browser:

```
http://YOUR_COMPUTER_IP:4000/test
http://YOUR_COMPUTER_IP:4000/health
```

5. Start frontend:

```
npm install
npx expo start -c
```

6. If Windows blocks backend:

```
netsh advfirewall firewall add rule name="JobNova Backend 4000" dir=in action=allow protocol=TCP localport=4000
```
