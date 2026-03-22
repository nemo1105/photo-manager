package terminal

import (
	"context"
	"io"
)

type process interface {
	io.ReadWriteCloser
	Resize(cols, rows int) error
	Terminate() error
	Wait(ctx context.Context) (int, error)
}
