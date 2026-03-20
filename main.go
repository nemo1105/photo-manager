package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/web"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	launchRoot, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get working directory: %w", err)
	}

	configPath, err := config.DefaultPath()
	if err != nil {
		return fmt.Errorf("resolve config path: %w", err)
	}

	cfg, created, err := config.LoadOrInit(configPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if created {
		log.Printf("created default config at %s", configPath)
	}

	photoApp := app.New(launchRoot, configPath, cfg, app.NewSystemTrash())
	handler := web.NewHandler(photoApp)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	defer listener.Close()

	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- server.Serve(listener)
	}()

	url := "http://" + listener.Addr().String()
	if err := app.OpenBrowser(url); err != nil {
		log.Printf("open browser failed: %v", err)
		log.Printf("visit %s manually", url)
	} else {
		log.Printf("opened %s", url)
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigCh)

	select {
	case sig := <-sigCh:
		log.Printf("received %s, shutting down", sig)
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve: %w", err)
		}
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}
