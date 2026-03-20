package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/web"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

func run(args []string) error {
	launchRoot, err := resolveLaunchRoot(args)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
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

func resolveLaunchRoot(args []string) (string, error) {
	fs := flag.NewFlagSet("photo-manager", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	dir := fs.String("dir", "", "directory to use as the launch root")
	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), "Usage: %s [-dir path]\n", fs.Name())
		fs.PrintDefaults()
	}

	if err := fs.Parse(args); err != nil {
		return "", err
	}
	if fs.NArg() > 0 {
		return "", fmt.Errorf("unexpected arguments: %s", strings.Join(fs.Args(), " "))
	}

	if *dir == "" {
		wd, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("get working directory: %w", err)
		}
		return wd, nil
	}

	absDir, err := filepath.Abs(*dir)
	if err != nil {
		return "", fmt.Errorf("resolve launch directory: %w", err)
	}

	info, err := os.Stat(absDir)
	if err != nil {
		return "", fmt.Errorf("stat launch directory: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("launch directory is not a directory: %s", absDir)
	}

	return absDir, nil
}
