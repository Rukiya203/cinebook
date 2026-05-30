package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/model"
)

type ChatRepository interface {
	Save(userID, role, content string) error
	FindByUserID(userID string, limit int) ([]*model.ChatMessage, error)
	DeleteByUserID(userID string) error
}

type postgresChatRepository struct {
	pool *pgxpool.Pool
}

func NewChatRepository(pool *pgxpool.Pool) ChatRepository {
	return &postgresChatRepository{pool: pool}
}

func (r *postgresChatRepository) Save(userID, role, content string) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
		userID, role, content,
	)
	return err
}

func (r *postgresChatRepository) FindByUserID(userID string, limit int) ([]*model.ChatMessage, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, role, content, created_at
		 FROM chat_messages
		 WHERE user_id = $1
		 ORDER BY created_at ASC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*model.ChatMessage
	for rows.Next() {
		m := &model.ChatMessage{}
		if err := rows.Scan(&m.ID, &m.UserID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func (r *postgresChatRepository) DeleteByUserID(userID string) error {
	_, err := r.pool.Exec(context.Background(),
		`DELETE FROM chat_messages WHERE user_id = $1`, userID)
	return err
}
