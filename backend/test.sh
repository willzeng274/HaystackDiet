#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Testing Food Game Backend API${NC}\n"

# 1. Start a new game
echo "1. Starting new game..."
GAME_RESPONSE=$(curl -s -X POST http://localhost:8000/game/start \
-H "Content-Type: application/json")

GAME_ID=$(echo $GAME_RESPONSE | jq -r '.game_id')
echo "Game ID: $GAME_ID"
echo -e "Response: $GAME_RESPONSE\n"

sleep 1

# 2. Generate a new order
echo "2. Generating new order..."
ORDER_RESPONSE=$(curl -s -X POST "http://localhost:8000/game/$GAME_ID/generate-order" \
-H "Content-Type: application/json")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order.id')
echo "Order ID: $ORDER_ID"
echo -e "Response: $ORDER_RESPONSE\n"

sleep 1

# 3. Get game state
echo "3. Getting game state..."
GAME_STATE_RESPONSE=$(curl -s -X GET "http://localhost:8000/game/$GAME_ID/state" \
-H "Content-Type: application/json")

echo -e "Game State: $GAME_STATE_RESPONSE\n"

sleep 1

# 4. Serve order - Success scenario
echo "4. Serving order (success scenario)..."
SERVE_RESPONSE=$(curl -s -X POST "http://localhost:8000/game/$GAME_ID/serve-order/$ORDER_ID" \
-H "Content-Type: application/json" \
-d "{
  \"items_served\": [\"AI Generated Item 1\", \"AI Generated Item 2\"]
}")

echo -e "Serve Response: $SERVE_RESPONSE\n"

sleep 1

# 5. Generate another order for failure testing
echo "5. Generating another order for failure testing..."
ORDER_RESPONSE_2=$(curl -s -X POST "http://localhost:8000/game/$GAME_ID/generate-order" \
-H "Content-Type: application/json")

ORDER_ID_2=$(echo $ORDER_RESPONSE_2 | jq -r '.order.id')
echo "Second Order ID: $ORDER_ID_2"
echo -e "Response: $ORDER_RESPONSE_2\n"

sleep 1

# 6. Serve order - Failure scenario (will randomly succeed or fail based on game logic)
echo "6. Serving order (potential failure scenario)..."
SERVE_RESPONSE_2=$(curl -s -X POST "http://localhost:8000/game/$GAME_ID/serve-order/$ORDER_ID_2" \
-H "Content-Type: application/json" \
-d "{
  \"items_served\": [\"Wrong Item 1\", \"Wrong Item 2\"]
}")

echo -e "Serve Response: $SERVE_RESPONSE_2\n"

sleep 1

# 7. Check leaderboard
echo "7. Checking leaderboard..."
LEADERBOARD_RESPONSE=$(curl -s -X GET "http://localhost:8000/game/leaderboard" \
-H "Content-Type: application/json")

echo -e "Leaderboard: $LEADERBOARD_RESPONSE\n"

# 8. Test error cases

# 8.1 Invalid game ID
echo "8.1 Testing invalid game ID..."
INVALID_GAME_RESPONSE=$(curl -s -X GET "http://localhost:8000/game/invalid-id/state" \
-H "Content-Type: application/json")

echo -e "Invalid Game Response: $INVALID_GAME_RESPONSE\n"

# 8.2 Invalid order ID
echo "8.2 Testing invalid order ID..."
INVALID_ORDER_RESPONSE=$(curl -s -X POST "http://localhost:8000/game/$GAME_ID/serve-order/invalid-order" \
-H "Content-Type: application/json" \
-d "{
  \"items_served\": [\"Item 1\"]
}")

echo -e "Invalid Order Response: $INVALID_ORDER_RESPONSE\n"

# Function to run complete game flow
run_complete_game() {
    local game_id=$1
    local orders=3
    
    echo "Running complete game flow with $orders orders..."
    
    for i in $(seq 1 $orders); do
        echo "Order $i of $orders"
        
        # Generate order
        order_resp=$(curl -s -X POST "http://localhost:8000/game/$game_id/generate-order" \
        -H "Content-Type: application/json")
        
        order_id=$(echo $order_resp | jq -r '.order.id')
        
        # Serve order
        serve_resp=$(curl -s -X POST "http://localhost:8000/game/$game_id/serve-order/$order_id" \
        -H "Content-Type: application/json" \
        -d "{
          \"items_served\": [\"Test Item 1\", \"Test Item 2\"]
        }")
        
        echo "Order $i result: $serve_resp"
        sleep 2
    done
    
    # Get final game state
    final_state=$(curl -s -X GET "http://localhost:8000/game/$game_id/state" \
    -H "Content-Type: application/json")
    
    echo "Final game state: $final_state"
}

# 9. Run a complete game
echo "9. Running complete game flow..."
NEW_GAME_RESPONSE=$(curl -s -X POST http://localhost:8000/game/start \
-H "Content-Type: application/json")
NEW_GAME_ID=$(echo $NEW_GAME_RESPONSE | jq -r '.game_id')

run_complete_game $NEW_GAME_ID

echo -e "${GREEN}Test suite completed!${NC}"