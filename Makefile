test:     ; cd app && npm install && npm test
run:      ; cd app && npm start
up:       ; docker compose up --build --scale app=3
down:     ; docker compose down
dtest:    ; docker compose --profile test run --rm test
cluster:  ; ./scripts/create-cluster.sh
deploy:   ; ./scripts/deploy.sh
cleanup:  ; ./scripts/cleanup.sh
