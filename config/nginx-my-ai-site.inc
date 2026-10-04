# Trading terminal proxy config
# Proxy all API requests to the backend on port 11110
location ~* ^/(api|trade|markets)/ {
    proxy_pass http://127.0.0.1:22220;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# my-ai-site public doors (included by tittil.online + tittil.cloud)
location = /mcp-info { proxy_pass http://127.0.0.1:8902; proxy_set_header Host $host; }
location = /llms.txt { proxy_pass http://127.0.0.1:8902; proxy_set_header Host $host; }
location = /setup { return 404; }
location / {
    proxy_pass http://127.0.0.1:22220;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
