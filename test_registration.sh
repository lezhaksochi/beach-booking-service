#!/bin/bash

echo "🧪 Тестирование регистрации 10 пользователей..."
echo "================================================"

# Test data
users=(
    '{"phone": "+79991234568", "password": "test123"}'
    '{"phone": "+79991234569", "password": "test123"}'
    '{"phone": "+79991234570", "password": "test123"}'
    '{"phone": "+79991234571", "password": "test123"}'
    '{"phone": "+79991234572", "password": "test123"}'
    '{"phone": "+79991234573", "password": "test123"}'
    '{"phone": "+79991234574", "password": "test123"}'
    '{"phone": "+79991234575", "password": "test123"}'
    '{"phone": "+79991234576", "password": "test123"}'
    '{"phone": "+79991234577", "password": "test123"}'
)

success_count=0
fail_count=0

for i in "${!users[@]}"; do
    user_data="${users[$i]}"
    echo ""
    echo "Регистрация пользователя $((i+1))/10..."
    
    response=$(curl -s -X POST http://localhost:3001/api/auth/register \
        -H "Content-Type: application/json" \
        -d "$user_data" \
        -w "\n%{http_code}")
    
    # Extract HTTP status code
    http_code=$(echo "$response" | tail -1)
    json_response=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "201" ]; then
        echo "✅ Успешно зарегистрирован: $(echo "$json_response" | grep -o '"phone":"[^"]*"')"
        ((success_count++))
    else
        echo "❌ Ошибка регистрации: $json_response"
        ((fail_count++))
    fi
done

echo ""
echo "================================================"
echo "📊 Результаты тестирования:"
echo "✅ Успешных регистраций: $success_count"
echo "❌ Неудачных регистраций: $fail_count"

if [ $success_count -eq 10 ]; then
    echo "🎉 Все 10 пользователей успешно зарегистрированы!"
    exit 0
else
    echo "⚠️ Не все пользователи зарегистрированы"
    exit 1
fi