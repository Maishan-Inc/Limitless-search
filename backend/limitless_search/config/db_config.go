package config

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type dbSettings map[string]json.RawMessage

func loadDBSettings(ctx context.Context) (dbSettings, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, nil
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, "SELECT key, value_json FROM app_settings WHERE category = 'core'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := dbSettings{}
	for rows.Next() {
		var key string
		var raw []byte
		if err := rows.Scan(&key, &raw); err != nil {
			return nil, err
		}
		settings[key] = json.RawMessage(raw)
	}

	return settings, rows.Err()
}

func (settings dbSettings) stringValue(key string) (string, bool) {
	raw, ok := settings[key]
	if !ok {
		return "", false
	}
	var value string
	if err := json.Unmarshal(raw, &value); err == nil {
		return value, true
	}
	return strings.Trim(string(raw), `"`), true
}

func (settings dbSettings) boolValue(key string) (bool, bool) {
	raw, ok := settings[key]
	if !ok {
		return false, false
	}
	var value bool
	if err := json.Unmarshal(raw, &value); err == nil {
		return value, true
	}
	asString := strings.Trim(string(raw), `"`)
	return asString == "true" || asString == "1", true
}

func (settings dbSettings) intValue(key string) (int, bool) {
	raw, ok := settings[key]
	if !ok {
		return 0, false
	}
	var value int
	if err := json.Unmarshal(raw, &value); err == nil {
		return value, true
	}
	asString := strings.Trim(string(raw), `"`)
	parsed, err := strconv.Atoi(asString)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func (settings dbSettings) stringSliceValue(key string) ([]string, bool) {
	raw, ok := settings[key]
	if !ok {
		return nil, false
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err == nil {
		return values, true
	}
	asString := strings.Trim(string(raw), `"`)
	if asString == "" {
		return []string{}, true
	}
	parts := strings.Split(asString, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out, true
}

func applyDatabaseSettings() {
	settings, err := loadDBSettings(context.Background())
	if err != nil {
		log.Printf("[config] database settings unavailable: %v", err)
		return
	}
	if len(settings) == 0 {
		return
	}

	if value, ok := settings.stringSliceValue("core.channels"); ok && len(value) > 0 {
		AppConfig.DefaultChannels = value
	}
	if value, ok := settings.stringSliceValue("core.enabled_plugins"); ok {
		AppConfig.EnabledPlugins = value
	}
	if value, ok := settings.stringValue("core.proxy"); ok {
		AppConfig.ProxyURL = value
		AppConfig.UseProxy = value != ""
	}
	if value, ok := settings.boolValue("core.cache.enabled"); ok {
		AppConfig.CacheEnabled = value
	}
	if value, ok := settings.intValue("core.cache.max_size"); ok && value > 0 {
		AppConfig.CacheMaxSizeMB = value
	}
	if value, ok := settings.intValue("core.cache.ttl"); ok && value > 0 {
		AppConfig.CacheTTLMinutes = value
	}
	if value, ok := settings.boolValue("core.async.enabled"); ok {
		AppConfig.AsyncPluginEnabled = value
	}
	if value, ok := settings.intValue("core.async.response_timeout"); ok && value > 0 {
		AppConfig.AsyncResponseTimeout = value
		AppConfig.AsyncResponseTimeoutDur = time.Duration(value) * time.Second
	}
	if value, ok := settings.intValue("core.async.max_workers"); ok && value > 0 {
		AppConfig.AsyncMaxBackgroundWorkers = value
	}
	if value, ok := settings.intValue("core.async.max_tasks"); ok && value > 0 {
		AppConfig.AsyncMaxBackgroundTasks = value
	}
	if value, ok := settings.intValue("core.async.cache_ttl_hours"); ok && value > 0 {
		AppConfig.AsyncCacheTTLHours = value
	}
}
