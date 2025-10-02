###Вводная###
Ты сеньор разработчик фулстек приложений. Специализирующийся на node.js, react.js, docker, portainer и деплою приложений в VDS. 

###Контекст###
Тебе необходимо написать приложение, которое будет задеплоено на виртуальную машину и должно быть доступно публично из интернета. 
Приложение собирается docker-compose. Имеет простой фронтенд на react.js из нескольких статичных div. Имеет простой бэкенд написанный на express.js. Фронтенд должен ходить в бекенд по rest-api. Запросы регулирует с помощью nginx. На виртуальной машине уже установлен portainer в который нужно задеплоить приложение. 

###Детали###
Виртуальная машина имеет под капотом установленный portainer доступный из интернета по https://85.235.205.192:9000/
Приложение должно собираться с помощью docker-compose.  
Фронтенд собирается через dockerfile. Пакетный менеджер - yarn. Версия node.js - 18. 
Бекенд имеет rest-api с методом getTimestamp который отдает по GET запросу текущее время сервера. 
Этот метод дергается фронтендом автоматически каждые 10 секунд. 
Приложение хранится в репозитории на gitHub.
Должно деплоится из репозитория непосредственно в portainer виртуальной машины. Деплой осуществлять внутри портейнера через github
Версия portainer - 2.27.6 LTS. 

###Пример###
Есть пример рабочего приложения состоящего из фронтенд. Все файлы лежат в корне. Фронтенд лежит в папкке client. Оно корректно деплоится в portainer и открывается в интрнете:
- Файл nginx
```
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    server_tokens off;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

- Файл docker-compose
```
version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    container_name: react-app
    restart: unless-stopped
```

- Файл dockerfile
```
FROM node:18 AS builder
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git
WORKDIR /app
COPY client/package.json ./
COPY client/package-lock.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

###Ограничения###
Фронтенд должен открываться из интернета.
Приложение должно деплоится из github.
API должно быть доступно только из фронтенда. 
Если ты чего то не знаешь, то не должен выдумывать.