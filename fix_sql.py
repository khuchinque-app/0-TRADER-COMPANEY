import re

with open("/home/khuchinque/0-TRADER-COMPANEY/apps/backend/src/index.ts", "r") as f:
    content = f.read()

# Fix the SQL - status = filled needs quotes
content = content.replace(
    "AND o.status = filled",
    "AND o.status = 'filled'"
)

with open("/home/khuchinque/0-TRADER-COMPANEY/apps/backend/src/index.ts", "w") as f:
    f.write(content)

print("OK: Fixed SQL syntax")
